import { apiFetch } from './request'
import {
  parseAttachmentMetadata,
  type TicketAttachmentMetadata,
} from './ticket-detail'
import { TicketApiError } from './tickets'

function errorFrom(body: unknown, fallback: string) {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: unknown }).error
    if (typeof error === 'object' && error !== null) {
      const value = error as Record<string, unknown>
      const fieldErrors: Record<string, string> = {}
      if (typeof value.fieldErrors === 'object' && value.fieldErrors !== null &&
        !Array.isArray(value.fieldErrors)) {
        const reason = (value.fieldErrors as Record<string, unknown>).reason
        if (typeof reason === 'string' && reason.trim()) fieldErrors.reason = reason
      }
      return new TicketApiError(
        typeof value.code === 'string' ? value.code : 'REQUEST_FAILED',
        typeof value.message === 'string' ? value.message : fallback,
        fieldErrors,
      )
    }
  }
  return new TicketApiError('REQUEST_FAILED', fallback)
}

async function metadataResponse(response: Response, fallback: string) {
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) throw errorFrom(body, fallback)
  const attachment = parseAttachmentMetadata(body)
  if (!attachment) throw new TicketApiError('INVALID_RESPONSE', fallback)
  return attachment
}

function base(ticketNumber: string) {
  return `/api/tickets/${encodeURIComponent(ticketNumber)}/attachments`
}

export async function uploadAttachment(
  ticketNumber: string,
  requesterId: number,
  file: File,
): Promise<TicketAttachmentMetadata> {
  const form = new FormData()
  form.append('file', file)
  const response = await apiFetch(base(ticketNumber), {
    method: 'POST',
    headers: { 'X-Development-Requester-Id': String(requesterId) },
    body: form,
  })
  return metadataResponse(response, 'The attachment could not be uploaded.')
}

export async function removeAttachment(
  ticketNumber: string,
  attachmentId: number,
  requesterId: number,
  reason: string,
): Promise<TicketAttachmentMetadata> {
  const response = await apiFetch(base(ticketNumber) + '/' + attachmentId, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'X-Development-Requester-Id': String(requesterId),
    },
    body: JSON.stringify({ reason }),
  })
  return metadataResponse(response, 'The attachment could not be removed.')
}

export async function getAttachmentContent(
  ticketNumber: string,
  attachmentId: number,
  requesterId: number,
  disposition: 'inline' | 'attachment',
) {
  const response = await apiFetch(
    base(ticketNumber) + '/' + attachmentId + '/content?disposition=' + disposition,
    { headers: { 'X-Development-Requester-Id': String(requesterId) } },
  )
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null)
    throw errorFrom(body, 'Attachment content is unavailable.')
  }
  return response.blob()
}
