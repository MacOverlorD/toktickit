import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getAttachmentContent,
  removeAttachment,
  uploadAttachment,
} from '../../src/api/attachments'
import { apiFetch } from '../../src/api/request'

vi.mock('../../src/api/request', () => ({ apiFetch: vi.fn() }))

const metadata = {
  id: 7,
  originalName: 'evidence.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 30,
  createdAt: '2026-09-04T10:00:00.000Z',
  isRemoved: false,
  removedAt: null,
  removalReason: null,
}

beforeEach(() => vi.clearAllMocks())

describe('attachment API client', () => {
  it('uploads FormData with requester context and no manual content type', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue(metadata),
    } as unknown as Response)
    const file = new File(['%PDF'], 'evidence.pdf', { type: 'application/pdf' })
    await expect(uploadAttachment('TKT-20260904-A1B2C3D4', 3, file))
      .resolves.toEqual(metadata)
    const [, init] = vi.mocked(apiFetch).mock.calls[0]
    expect(init?.headers).toEqual({ 'X-Development-Requester-Id': '3' })
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).get('file')).toBe(file)
  })

  it('sends a trimmed removal intent as JSON to the owned route', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        ...metadata,
        isRemoved: true,
        removedAt: '2026-09-04T11:00:00.000Z',
        removalReason: 'Wrong document',
      }),
    } as unknown as Response)
    await removeAttachment('TKT-20260904-A1B2C3D4', 7, 3, 'Wrong document')
    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tickets/TKT-20260904-A1B2C3D4/attachments/7',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ reason: 'Wrong document' }),
      }),
    )
  })

  it('requests protected inline/download bytes and preserves safe errors', async () => {
    const blob = new Blob(['content'], { type: 'application/pdf' })
    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: true, blob: vi.fn().mockResolvedValue(blob),
    } as unknown as Response)
    await expect(getAttachmentContent('TKT-20260904-A1B2C3D4', 7, 3, 'inline'))
      .resolves.toBe(blob)
    expect(apiFetch).toHaveBeenLastCalledWith(
      '/api/tickets/TKT-20260904-A1B2C3D4/attachments/7/content?disposition=inline',
      { headers: { 'X-Development-Requester-Id': '3' } },
    )

    vi.mocked(apiFetch).mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { code: 'ATTACHMENT_REMOVED', message: 'Unavailable.' },
      }),
    } as unknown as Response)
    await expect(getAttachmentContent('TKT-20260904-A1B2C3D4', 7, 3, 'attachment'))
      .rejects.toMatchObject({ code: 'ATTACHMENT_REMOVED' })
  })

  it('rejects malformed successful metadata', async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true, json: vi.fn().mockResolvedValue({ ...metadata, storedName: 'x', id: -1 }),
    } as unknown as Response)
    await expect(uploadAttachment(
      'TKT-20260904-A1B2C3D4',
      3,
      new File(['x'], 'x.pdf', { type: 'application/pdf' }),
    )).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
  })
})
