import { constants } from 'node:fs'
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import type { RequestHandler, Response } from 'express'
import multer from 'multer'
import { Prisma } from '@prisma/client'
import { ApiError } from '../errors/api-error.js'
import prisma from '../prisma.js'
import {
  MAX_ACTIVE_ATTACHMENTS,
  MAX_ATTACHMENT_SIZE,
  parseAttachmentId,
  validateAttachment,
} from './attachment-policy.js'

const ticketPattern = /^TKT-\d{8}-[A-F0-9]{8}$/
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_SIZE + 1, files: 1, fields: 0 },
})

export const parseAttachmentUpload = upload.single('file')

function ticketNumber(raw: string | string[] | undefined) {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
  if (!ticketPattern.test(value)) {
    throw new ApiError(400, 'INVALID_TICKET_NUMBER', 'Provide a valid Ticket Number.')
  }
  return value
}

function requesterId(response: Response) {
  return (response.locals.developmentRequester as { id: number }).id
}

function storageDirectory() {
  return resolve(process.env.UPLOAD_DIR ?? 'uploads')
}

async function cleanupAttachmentFile(path: string) {
  try {
    await unlink(path)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Attachment cleanup failed.', error)
    }
  }
}

function metadata(attachment: {
  id: number
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: Date
  removedAt: Date | null
  removalReason: string | null
}) {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    createdAt: attachment.createdAt.toISOString(),
    isRemoved: attachment.removedAt !== null,
    removedAt: attachment.removedAt?.toISOString() ?? null,
    removalReason: attachment.removalReason,
  }
}

function notFound() {
  return new ApiError(404, 'RESOURCE_NOT_FOUND', 'Resource was not found.')
}

async function ownedTicket(number: string, ownerId: number) {
  const ticket = await prisma.ticket.findFirst({
    where: { ticketNumber: number, requesterId: ownerId },
    select: { id: true },
  })
  if (!ticket) throw notFound()
  return ticket
}

export const requireOwnedAttachmentTicket: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.locals.attachmentTicket = await ownedTicket(
      ticketNumber(request.params.ticketNumber),
      requesterId(response),
    )
    next()
  } catch (error) {
    next(error)
  }
}

async function createAttachmentMetadata(
  ticketId: number,
  ownerId: number,
  validated: Awaited<ReturnType<typeof validateAttachment>>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (transaction) => {
        const count = await transaction.attachment.count({
          where: { ticketId, removedAt: null },
        })
        if (count >= MAX_ACTIVE_ATTACHMENTS) {
          throw new ApiError(409, 'ATTACHMENT_LIMIT_REACHED', 'A ticket can have five active attachments.')
        }
        return transaction.attachment.create({
          data: { ticketId, uploadedByRequesterId: ownerId, ...validated },
          select: {
            id: true, originalName: true, mimeType: true, sizeBytes: true,
            createdAt: true, removedAt: true, removalReason: true,
          },
        })
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2034'
      if (!retryable || attempt === 2) throw error
    }
  }
  throw new Error('Attachment transaction retry exhausted.')
}

export const listAttachments: RequestHandler = async (request, response, next) => {
  try {
    const ticket = await ownedTicket(ticketNumber(request.params.ticketNumber), requesterId(response))
    const attachments = await prisma.attachment.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: {
        id: true, originalName: true, mimeType: true, sizeBytes: true,
        createdAt: true, removedAt: true, removalReason: true,
      },
    })
    response.json(attachments.map(metadata))
  } catch (error) {
    next(error)
  }
}

export const uploadAttachment: RequestHandler = async (request, response, next) => {
  let temporaryPath: string | null = null
  let storedPath: string | null = null
  try {
    const ownerId = requesterId(response)
    const ticket = response.locals.attachmentTicket as { id: number }
    const directory = storageDirectory()
    await mkdir(directory, { recursive: true })
    temporaryPath = resolve(directory, randomUUID() + '.uploading')
    await writeFile(temporaryPath, request.file?.buffer ?? Buffer.alloc(0), { flag: 'wx' })

    const validated = await validateAttachment(request.file)
    storedPath = resolve(directory, validated.storedName)
    await rename(temporaryPath, storedPath)
    temporaryPath = null

    const attachment = await createAttachmentMetadata(ticket.id, ownerId, validated)

    response.status(201).json(metadata(attachment))
  } catch (error) {
    if (temporaryPath) await cleanupAttachmentFile(temporaryPath)
    if (storedPath) await cleanupAttachmentFile(storedPath)
    if (error instanceof ApiError) return next(error)
    next(new ApiError(500, 'ATTACHMENT_UPLOAD_FAILED', 'The attachment could not be uploaded.'))
  }
}

function contentDisposition(name: string, disposition: 'inline' | 'attachment') {
  const fallback = name.replace(/[^\x20-\x7E]/g, '_').replace(/[\x22\\]/g, '_')
  const encoded = encodeURIComponent(name).replace(/[!'()*]/g, (value) =>
    '%' + value.charCodeAt(0).toString(16).toUpperCase())
  const quote = String.fromCharCode(34)
  return disposition + '; filename=' + quote + fallback + quote +
    '; filename*=UTF-8' + String.fromCharCode(39, 39) + encoded
}

export const getAttachmentContent: RequestHandler = async (request, response, next) => {
  try {
    const keys = Object.keys(request.query)
    const rawDisposition = request.query.disposition
    if (keys.some((key) => key !== 'disposition') || Array.isArray(rawDisposition) ||
      (rawDisposition !== undefined && rawDisposition !== 'inline' && rawDisposition !== 'attachment')) {
      throw new ApiError(400, 'INVALID_QUERY', 'Provide valid attachment query parameters.')
    }
    const ticket = await ownedTicket(ticketNumber(request.params.ticketNumber), requesterId(response))
    const attachment = await prisma.attachment.findFirst({
      where: { id: parseAttachmentId(request.params.attachmentId), ticketId: ticket.id },
    })
    if (!attachment) throw notFound()
    if (attachment.removedAt) {
      throw new ApiError(410, 'ATTACHMENT_REMOVED', 'Attachment content is no longer available.')
    }
    const path = resolve(storageDirectory(), attachment.storedName)
    await access(path, constants.R_OK).catch(() => {
      throw new ApiError(500, 'ATTACHMENT_CONTENT_UNAVAILABLE', 'Attachment content is unavailable.')
    })
    const content = await readFile(path)
    response
      .set({
        'Content-Type': attachment.mimeType,
        'Content-Length': String(content.length),
        'Content-Disposition': contentDisposition(
          attachment.originalName,
          rawDisposition === 'attachment' ? 'attachment' : 'inline',
        ),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      })
      .send(content)
  } catch (error) {
    next(error)
  }
}

export const removeAttachment: RequestHandler = async (request, response, next) => {
  try {
    const reason = typeof request.body?.reason === 'string' ? request.body.reason.trim() : ''
    if (Object.keys(request.body ?? {}).some((key) => key !== 'reason') ||
      reason.length < 5 || reason.length > 250) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Review the highlighted fields.', {
        reason: 'Removal reason must contain 5 to 250 characters.',
      })
    }
    const ownerId = requesterId(response)
    const ticket = await ownedTicket(ticketNumber(request.params.ticketNumber), ownerId)
    const id = parseAttachmentId(request.params.attachmentId)
    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.attachment.updateMany({
        where: { id, ticketId: ticket.id, removedAt: null },
        data: { removedAt: new Date(), removalReason: reason, removedByRequesterId: ownerId },
      })
      if (result.count === 0) {
        const existing = await transaction.attachment.findFirst({
          where: { id, ticketId: ticket.id },
          select: { removedAt: true },
        })
        if (!existing) throw notFound()
        throw new ApiError(409, 'ATTACHMENT_ALREADY_REMOVED', 'Attachment was already removed.')
      }
      return transaction.attachment.findUniqueOrThrow({
        where: { id },
        select: {
          id: true, originalName: true, mimeType: true, sizeBytes: true,
          createdAt: true, removedAt: true, removalReason: true,
        },
      })
    })
    response.json(metadata(updated))
  } catch (error) {
    next(error)
  }
}
