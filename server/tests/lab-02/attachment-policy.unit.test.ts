import { describe, expect, it } from 'vitest'
import { parseAttachmentId, validateAttachment } from '../../src/attachments/attachment-policy.js'

function file(name: string, mimetype: string, buffer: Buffer) {
  return { originalname: name, mimetype, buffer, size: buffer.length } as Express.Multer.File
}

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF')
const supported = [
  ['photo.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1])],
  ['image.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])],
  ['capture.webp', 'image/webp', Buffer.from('RIFF0000WEBPVP8 ')],
  ['report.pdf', 'application/pdf', pdf],
] as const

describe('attachment policy', () => {
  it.each(supported)('accepts supported signature %s', async (name, mime, buffer) => {
    await expect(validateAttachment(file(name, mime, buffer))).resolves.toMatchObject({
      originalName: name,
      mimeType: mime,
    })
  })

  it('accepts matching PDF content and creates a randomized safe stored name', async () => {
    const first = await validateAttachment(file('report.pdf', 'application/pdf', pdf))
    const second = await validateAttachment(file('report.pdf', 'application/pdf', pdf))
    expect(first).toMatchObject({
      originalName: 'report.pdf', mimeType: 'application/pdf', sizeBytes: pdf.length,
    })
    expect(first.storedName).toMatch(/^[0-9a-f-]{36}\.pdf$/)
    expect(second.storedName).not.toBe(first.storedName)
  })

  it.each([
    ['empty', file('empty.pdf', 'application/pdf', Buffer.alloc(0)), 'ATTACHMENT_INVALID'],
    ['unsupported', file('notes.txt', 'text/plain', Buffer.from('hello')), 'ATTACHMENT_TYPE_UNSUPPORTED'],
    ['extension mismatch', file('report.png', 'application/pdf', pdf), 'ATTACHMENT_TYPE_UNSUPPORTED'],
    ['MIME mismatch', file('report.pdf', 'image/png', pdf), 'ATTACHMENT_TYPE_UNSUPPORTED'],
  ])('rejects %s files', async (_name, input, code) => {
    await expect(validateAttachment(input)).rejects.toMatchObject({ code })
  })

  it('parses only positive PostgreSQL Int attachment IDs', () => {
    expect(parseAttachmentId('17')).toBe(17)
    for (const value of [undefined, '0', '-1', '1.5', '2147483648']) {
      expect(() => parseAttachmentId(value)).toThrowError(
        expect.objectContaining({ code: 'INVALID_ATTACHMENT_ID' }),
      )
    }
  })
})
