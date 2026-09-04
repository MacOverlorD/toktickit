import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import {
  getAttachmentContent,
  removeAttachment,
  uploadAttachment,
} from '../../src/api/attachments'
import { getDevelopmentRequesters } from '../../src/api/development-requesters'
import { getTicketDetail, type TicketDetail } from '../../src/api/ticket-detail'
import { DEVELOPMENT_REQUESTER_STORAGE_KEY } from '../../src/requesters/RequesterContext'

vi.mock('../../src/api/attachments', () => ({
  getAttachmentContent: vi.fn(),
  removeAttachment: vi.fn(),
  uploadAttachment: vi.fn(),
}))
vi.mock('../../src/api/development-requesters', () => ({
  getDevelopmentRequesters: vi.fn(),
}))
vi.mock('../../src/api/ticket-detail', () => ({ getTicketDetail: vi.fn() }))

const number = 'TKT-20260904-A1B2C3D4'
const requester = { id: 1, name: 'Anan Wong', email: 'anan@example.test' }
const active = {
  id: 11, originalName: 'evidence.pdf', mimeType: 'application/pdf',
  sizeBytes: 30, createdAt: '2026-09-04T10:01:00.000Z',
  isRemoved: false, removedAt: null, removalReason: null,
}
const removed = {
  ...active, id: 12, originalName: 'old.pdf', isRemoved: true,
  removedAt: '2026-09-04T11:00:00.000Z', removalReason: 'Wrong document',
}
const detail: TicketDetail = {
  ticketNumber: number, ticketDate: '2026-09-04T10:00:00.000Z',
  requester, category: { id: 1, name: 'Hardware' },
  relatedSystem: { id: 1, name: 'Laptop' }, summary: 'Attachment test',
  requestedPriority: 'MEDIUM', description: 'Attachment lifecycle test.',
  status: 'NEW', attachments: [active, removed],
}

beforeEach(() => {
  sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
  window.history.replaceState({}, '', '/tickets/' + number)
  vi.mocked(getDevelopmentRequesters).mockResolvedValue([requester])
  vi.mocked(getTicketDetail).mockResolvedValue(detail)
  vi.mocked(getAttachmentContent).mockResolvedValue(new Blob(['pdf']))
  vi.stubGlobal('open', vi.fn())
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:test') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
})

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Ticket Detail attachment section', () => {
  it('shows an explicit uploading state while storage is pending', async () => {
    let finishUpload: ((value: typeof active) => void) | undefined
    vi.mocked(uploadAttachment).mockReturnValue(new Promise((resolve) => {
      finishUpload = resolve
    }))
    render(<App />)
    await screen.findByText('evidence.pdf')

    fireEvent.change(screen.getByLabelText('Add attachments'), {
      target: {
        files: [new File(['%PDF'], 'pending.pdf', { type: 'application/pdf' })],
      },
    })
    expect(await screen.findByText('Uploading attachment...')).toBeInTheDocument()
    finishUpload!({ ...active, id: 13, originalName: 'pending.pdf' })
    expect(await screen.findByText('Attachment uploaded.')).toBeInTheDocument()
  })

  it('uploads valid files and exposes content actions only for active metadata', async () => {
    const uploaded = { ...active, id: 13, originalName: 'new.pdf' }
    vi.mocked(uploadAttachment).mockResolvedValue(uploaded)
    render(<App />)
    await screen.findByText('evidence.pdf')

    expect(screen.getByRole('button', { name: 'Preview evidence.pdf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Preview old.pdf' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Add attachments'), {
      target: {
        files: [new File(['%PDF'], 'new.pdf', { type: 'application/pdf' })],
      },
    })
    expect(await screen.findByText('Attachment uploaded.')).toBeInTheDocument()
    expect(screen.getByText('new.pdf')).toBeInTheDocument()
    expect(uploadAttachment).toHaveBeenCalledWith(number, 1, expect.any(File))

    fireEvent.click(screen.getByRole('button', { name: 'Preview evidence.pdf' }))
    await waitFor(() => expect(getAttachmentContent).toHaveBeenCalledWith(number, 11, 1, 'inline'))
    expect(window.open).toHaveBeenCalledWith('blob:test', '_blank', 'noopener,noreferrer')
  })

  it('requires a reason, soft-removes metadata, and hides content actions', async () => {
    vi.mocked(removeAttachment).mockResolvedValue({
      ...active,
      isRemoved: true,
      removedAt: '2026-09-04T12:00:00.000Z',
      removalReason: 'Uploaded by mistake',
    })
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove evidence.pdf' }))
    const dialog = screen.getByRole('dialog', { name: 'Remove attachment' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Attachment' }))
    expect(within(dialog).getByText(/5 to 250/)).toBeInTheDocument()

    fireEvent.change(within(dialog).getByRole('textbox', { name: 'Removal reason' }), {
      target: { value: '  Uploaded by mistake  ' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remove Attachment' }))
    expect(await screen.findByText('Attachment removed.')).toBeInTheDocument()
    expect(removeAttachment).toHaveBeenCalledWith(number, 11, 1, 'Uploaded by mistake')
    expect(screen.queryByRole('button', { name: 'Download evidence.pdf' })).not.toBeInTheDocument()
    expect(screen.getByText(/Uploaded by mistake/)).toBeInTheDocument()
  })

  it('retries only failed uploads without losing existing metadata', async () => {
    const uploaded = { ...active, id: 13, originalName: 'retry.pdf' }
    vi.mocked(uploadAttachment)
      .mockRejectedValueOnce(new Error('temporary storage failure'))
      .mockResolvedValueOnce(uploaded)
    render(<App />)
    await screen.findByText('evidence.pdf')
    const file = new File(['%PDF'], 'retry.pdf', { type: 'application/pdf' })
    fireEvent.change(screen.getByLabelText('Add attachments'), {
      target: { files: [file] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Some attachments could not be uploaded',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed uploads' }))
    expect(await screen.findByText('retry.pdf')).toBeInTheDocument()
    expect(screen.getByText('evidence.pdf')).toBeInTheDocument()
    expect(uploadAttachment).toHaveBeenCalledTimes(2)
  })

  it('preserves the removal reason when the API fails so it can be retried', async () => {
    vi.mocked(removeAttachment).mockRejectedValue(new Error('database failure'))
    render(<App />)
    fireEvent.click(await screen.findByRole('button', { name: 'Remove evidence.pdf' }))
    const reason = screen.getByRole('textbox', { name: 'Removal reason' })
    fireEvent.change(reason, { target: { value: 'Keep this reason for retry' } })
    fireEvent.click(screen.getByRole('button', { name: 'Remove Attachment' }))
    expect(await screen.findByText('The attachment could not be removed. Try again.'))
      .toBeInTheDocument()
    expect(reason).toHaveValue('Keep this reason for retry')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('cancels removal with Escape and returns focus to its trigger', async () => {
    render(<App />)
    const trigger = await screen.findByRole('button', { name: 'Remove evidence.pdf' })
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: 'Remove attachment' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
