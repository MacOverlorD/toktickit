import { extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'
import { ApiError } from '../errors/api-error.js'

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024
export const MAX_ACTIVE_ATTACHMENTS = 5

const allowedExtensions: Record<string, readonly string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
}

export interface ValidatedAttachment {
  originalName: string
  storedName: string
  mimeType: string
  sizeBytes: number
}

export async function validateAttachment(
  file: Express.Multer.File | undefined,
): Promise<ValidatedAttachment> {
  if (!file || file.size === 0) {
    throw new ApiError(400, 'ATTACHMENT_INVALID', 'Provide one non-empty file.')
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new ApiError(413, 'ATTACHMENT_TOO_LARGE', 'Attachment must not exceed 5 MiB.')
  }
  const originalName = file.originalname.trim()
  if (!originalName || originalName.length > 255) {
    throw new ApiError(400, 'ATTACHMENT_INVALID', 'Provide a valid file name.')
  }

  const detected = await fileTypeFromBuffer(file.buffer)
  const extension = extname(originalName).toLowerCase()
  const extensions = detected ? allowedExtensions[detected.mime] : undefined
  if (!detected || !extensions?.includes(extension) || file.mimetype !== detected.mime) {
    throw new ApiError(
      415,
      'ATTACHMENT_TYPE_UNSUPPORTED',
      'Use JPEG, PNG, WEBP, or PDF with matching file content.',
    )
  }

  const storedExtension = detected.mime === 'image/jpeg' ? '.jpg' : '.' + detected.ext
  return {
    originalName,
    storedName: randomUUID() + storedExtension,
    mimeType: detected.mime,
    sizeBytes: file.size,
  }
}

export function parseAttachmentId(value: string | string[] | undefined) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new ApiError(400, 'INVALID_ATTACHMENT_ID', 'Provide a valid Attachment ID.')
  }
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
    throw new ApiError(400, 'INVALID_ATTACHMENT_ID', 'Provide a valid Attachment ID.')
  }
  return id
}
