import { randomUUID } from 'node:crypto'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import app from '../../src/app.js'
import prisma from '../../src/prisma.js'

const marker = randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()
const ticketNumber = `TKT-20990301-${marker}`
const limitTicketNumber = `TKT-20990302-${marker}`
const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')
let uploadDirectory: string
let ownerId: number
let otherId: number
let ticketId: number
let limitTicketId: number
let attachmentId: number

function api(method: 'get' | 'post' | 'delete', path: string, contextId = ownerId) {
  return request(app)[method](path)
    .set('X-Development-Requester-Id', String(contextId))
}

beforeAll(async () => {
  uploadDirectory = await mkdtemp(join(tmpdir(), 'toktickit-attachments-'))
  process.env.UPLOAD_DIR = uploadDirectory
  const [category, system] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { isActive: true } }),
    prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } }),
  ])
  const [owner, other] = await Promise.all([
    prisma.requester.create({
      data: { name: 'Attachment Owner', email: `attachment-${marker}@example.test`.toLowerCase() },
    }),
    prisma.requester.create({
      data: { name: 'Attachment Other', email: `attachment-other-${marker}@example.test`.toLowerCase() },
    }),
  ])
  ownerId = owner.id
  otherId = other.id
  const data = (number: string) => ({
    ticketNumber: number, submissionKey: randomUUID(), requesterId: ownerId,
    categoryId: category.id, relatedSystemId: system.id,
    summary: 'Attachment integration ticket', requestedPriority: 'MEDIUM' as const,
    description: 'Attachment integration test description.',
  })
  const [ticket, limitTicket] = await Promise.all([
    prisma.ticket.create({ data: data(ticketNumber) }),
    prisma.ticket.create({ data: data(limitTicketNumber) }),
  ])
  ticketId = ticket.id
  limitTicketId = limitTicket.id
  const storedName = randomUUID() + '.pdf'
  await writeFile(join(uploadDirectory, storedName), pdf)
  const baseline = await prisma.attachment.create({
    data: {
      ticketId, originalName: 'baseline.pdf', storedName,
      mimeType: 'application/pdf', sizeBytes: pdf.length,
      uploadedByRequesterId: ownerId,
    },
  })
  attachmentId = baseline.id
})

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { ticketId: { in: [ticketId, limitTicketId] } } })
  await prisma.ticket.deleteMany({ where: { id: { in: [ticketId, limitTicketId] } } })
  await prisma.requester.deleteMany({ where: { id: { in: [ownerId, otherId] } } })
  await prisma.$disconnect()
  await rm(uploadDirectory, { recursive: true, force: true })
  delete process.env.UPLOAD_DIR
})

describe('Issue 18 attachment lifecycle API', () => {
  it('uploads, lists, and serves protected inline/download bytes with safe metadata', async () => {
    const uploaded = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', pdf, { filename: 'evidence.pdf', contentType: 'application/pdf' })
    expect(uploaded.status).toBe(201)
    expect(uploaded.body).toMatchObject({
      originalName: 'evidence.pdf', mimeType: 'application/pdf',
      sizeBytes: pdf.length, isRemoved: false, removedAt: null, removalReason: null,
    })
    expect(uploaded.body).not.toHaveProperty('storedName')
    const uploadedId = uploaded.body.id as number
    const stored = await prisma.attachment.findUniqueOrThrow({ where: { id: uploadedId } })
    expect(stored.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    const storedFiles = await readdir(uploadDirectory)
    expect(storedFiles).toContain(stored.storedName)
    expect(storedFiles.some((name) => name.endsWith('.uploading'))).toBe(false)

    const listed = await api('get', `/api/tickets/${ticketNumber}/attachments`)
    expect(listed.body).toEqual(expect.arrayContaining([uploaded.body]))
    const contentPath = `/api/tickets/${ticketNumber}/attachments/${uploadedId}/content`
    const inline = await api('get', contentPath)
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
    expect(inline.status).toBe(200)
    expect(inline.body).toEqual(pdf)
    expect(inline.headers['content-disposition']).toMatch(/^inline;/)
    expect(inline.headers['x-content-type-options']).toBe('nosniff')
    expect(inline.headers['cache-control']).toBe('private, no-store')
    const download = await api('get', contentPath + '?disposition=attachment')
    expect(download.headers['content-disposition']).toMatch(/^attachment;/)
  })

  it('rejects invalid multipart requests without metadata', async () => {
    const before = await prisma.attachment.count({ where: { ticketId } })
    const missing = await api('post', `/api/tickets/${ticketNumber}/attachments`)
    const mismatch = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', pdf, { filename: 'fake.png', contentType: 'image/png' })
    const multiple = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', pdf, { filename: 'one.pdf', contentType: 'application/pdf' })
      .attach('file', pdf, { filename: 'two.pdf', contentType: 'application/pdf' })
    const empty = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', Buffer.alloc(0), { filename: 'empty.pdf', contentType: 'application/pdf' })
    const oversized = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'large.pdf', contentType: 'application/pdf',
      })
    expect(missing.body.error.code).toBe('ATTACHMENT_INVALID')
    expect(mismatch.body.error.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED')
    expect(multiple.body.error.code).toBe('ATTACHMENT_INVALID')
    expect(empty.body.error.code).toBe('ATTACHMENT_INVALID')
    expect(oversized.status).toBe(413)
    expect(oversized.body.error.code).toBe('ATTACHMENT_TOO_LARGE')
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(before)
  })

  it('rejects invalid content query and attachment IDs with safe JSON', async () => {
    const base = `/api/tickets/${ticketNumber}/attachments/`
    const invalidId = await api('get', base + 'not-an-id/content')
    const invalidQuery = await api('get', base + attachmentId + '/content?unknown=true')
    expect(invalidId.status).toBe(400)
    expect(invalidId.body.error.code).toBe('INVALID_ATTACHMENT_ID')
    expect(invalidQuery.status).toBe(400)
    expect(invalidQuery.body.error.code).toBe('INVALID_QUERY')
  })

  it('returns a safe failure when metadata content is missing from storage', async () => {
    const missing = await prisma.attachment.create({
      data: {
        ticketId, originalName: 'missing.pdf', storedName: randomUUID() + '.pdf',
        mimeType: 'application/pdf', sizeBytes: pdf.length,
        uploadedByRequesterId: ownerId,
      },
    })
    const response = await api(
      'get',
      `/api/tickets/${ticketNumber}/attachments/${missing.id}/content`,
    )
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('ATTACHMENT_CONTENT_UNAVAILABLE')
  })

  it('uses safe not-found for cross-owner list/upload/content/removal', async () => {
    const base = `/api/tickets/${ticketNumber}/attachments`
    const responses = [
      await api('get', base, otherId),
      await api('post', base, otherId)
        .attach('file', pdf, { filename: 'private.pdf', contentType: 'application/pdf' }),
      await api('get', base + '/' + attachmentId + '/content', otherId),
      await api('delete', base + '/' + attachmentId, otherId)
        .send({ reason: 'Should not be allowed' }),
    ]
    for (const response of responses) {
      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('RESOURCE_NOT_FOUND')
    }
  })

  it('enforces five active files and removes the rejected stored file', async () => {
    await prisma.attachment.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        ticketId: limitTicketId, originalName: `existing-${index}.pdf`,
        storedName: randomUUID() + '.pdf', mimeType: 'application/pdf',
        sizeBytes: pdf.length, uploadedByRequesterId: ownerId,
      })),
    })
    const before = await readdir(uploadDirectory)
    const response = await api('post', `/api/tickets/${limitTicketNumber}/attachments`)
      .attach('file', pdf, { filename: 'sixth.pdf', contentType: 'application/pdf' })
    expect(response.status).toBe(409)
    expect(response.body.error.code).toBe('ATTACHMENT_LIMIT_REACHED')
    expect(await readdir(uploadDirectory)).toEqual(before)
  })

  it('compensates storage failure without metadata', async () => {
    const blocked = join(uploadDirectory, 'not-a-directory')
    await writeFile(blocked, 'blocked')
    const original = process.env.UPLOAD_DIR
    process.env.UPLOAD_DIR = blocked
    const before = await prisma.attachment.count({ where: { ticketId } })
    const response = await api('post', `/api/tickets/${ticketNumber}/attachments`)
      .attach('file', pdf, { filename: 'failure.pdf', contentType: 'application/pdf' })
    process.env.UPLOAD_DIR = original
    expect(response.status).toBe(500)
    expect(response.body.error.code).toBe('ATTACHMENT_UPLOAD_FAILED')
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(before)
  })

  it('removes final and temporary files when the metadata transaction fails', async () => {
    const filesBefore = await readdir(uploadDirectory)
    const metadataBefore = await prisma.attachment.count({ where: { ticketId } })
    const transaction = vi.spyOn(prisma, '$transaction')
      .mockRejectedValueOnce(new Error('injected metadata failure'))
    let response: Awaited<ReturnType<typeof api>>
    try {
      response = await api('post', `/api/tickets/${ticketNumber}/attachments`)
        .attach('file', pdf, { filename: 'metadata-failure.pdf', contentType: 'application/pdf' })
    } finally {
      transaction.mockRestore()
    }

    expect(response!.status).toBe(500)
    expect(response!.body.error.code).toBe('ATTACHMENT_UPLOAD_FAILED')
    expect(await prisma.attachment.count({ where: { ticketId } })).toBe(metadataBefore)
    expect(await readdir(uploadDirectory)).toEqual(filesBefore)
  })

  it('maps an oversized JSON removal body to the safe 413 contract', async () => {
    const response = await api(
      'delete',
      `/api/tickets/${ticketNumber}/attachments/${attachmentId}`,
    ).send({ reason: 'x'.repeat(110 * 1024) })
    expect(response.status).toBe(413)
    expect(response.body).toEqual({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The JSON request body is too large.',
      },
    })
  })

  it('validates reason, soft-removes once, retains metadata, and blocks content', async () => {
    const path = `/api/tickets/${ticketNumber}/attachments/${attachmentId}`
    const invalid = await api('delete', path).send({ reason: 'bad' })
    expect(invalid.status).toBe(400)
    expect(invalid.body.error.fieldErrors.reason).toBeTruthy()
    const removed = await api('delete', path).send({ reason: 'Uploaded the wrong document' })
    expect(removed.body).toMatchObject({
      id: attachmentId, isRemoved: true, removalReason: 'Uploaded the wrong document',
    })
    const content = await api('get', path + '/content')
    expect(content.status).toBe(410)
    expect(content.body.error.code).toBe('ATTACHMENT_REMOVED')
    const repeated = await api('delete', path).send({ reason: 'Remove this file again' })
    expect(repeated.status).toBe(409)
    const listed = await api('get', `/api/tickets/${ticketNumber}/attachments`)
    expect(listed.body[0]).toMatchObject({ id: attachmentId, isRemoved: true })
  })
})
