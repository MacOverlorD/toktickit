import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ActionsTakenSection from '../../src/components/ActionsTakenSection'
import * as api from '../../src/api/actions-taken'

vi.mock('../../src/api/actions-taken', async (importOriginal) => ({
  ...(await importOriginal<typeof api>()),
  listActionsTaken: vi.fn(),
  createActionTaken: vi.fn(),
  editActionTaken: vi.fn(),
  assignActionTaken: vi.fn(),
  transitionActionTaken: vi.fn(),
  completeActionTaken: vi.fn(),
}))

const ticketNumber = 'TKT-20260928-A1B2C3D4'
const base: api.ActionTaken = {
  id: 12,
  ticketNumber,
  ticketWorkCycle: 1,
  actionAt: null,
  description: 'Inspect the access point logs',
  result: null,
  status: 'PLANNED',
  createdBy: { id: 9, name: 'Suda' },
  performedBy: null,
  assignedTo: { id: 9, name: 'Suda', role: 'IT_STAFF' },
  followUpRequired: true,
  followUpNote: 'Ask for a fresh connection test.',
  attachmentNotes: 'Packet capture is referenced here; no file is attached.',
  version: 3,
  createdAt: '2026-09-28T02:00:00.000Z',
  updatedAt: '2026-09-28T02:00:00.000Z',
  completedAt: null,
  cancelledAt: null,
}

beforeEach(() => {
  vi.mocked(api.listActionsTaken).mockResolvedValue([base])
  vi.mocked(api.createActionTaken).mockResolvedValue({ ...base, id: 13 })
  vi.mocked(api.editActionTaken).mockResolvedValue({ ...base, description: 'Edited', version: 4 })
  vi.mocked(api.assignActionTaken).mockResolvedValue({ ...base, assignedTo: null, version: 4 })
  vi.mocked(api.transitionActionTaken).mockResolvedValue({ ...base, status: 'IN_PROGRESS', version: 4 })
  vi.mocked(api.completeActionTaken).mockResolvedValue({
    ...base,
    status: 'COMPLETED',
    result: 'Connection restored',
    performedBy: { id: 10, name: 'Mali' },
    completedAt: '2026-09-28T03:00:00.000Z',
    version: 4,
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('Actions Taken Ticket Detail UI', () => {
  it('renders the requester projection as shared read-only history without operational controls', async () => {
    vi.mocked(api.listActionsTaken).mockResolvedValue([
      { ...base, id: 13, description: 'Newest work', createdBy: { name: 'Mali' }, assignedTo: undefined, version: undefined },
      { ...base, id: 12, description: 'Older work', createdBy: { name: 'Suda' }, assignedTo: undefined, version: undefined },
    ])
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'requester'} />)

    expect(await screen.findByText('Newest work')).toBeInTheDocument()
    const cards = screen.getAllByRole('article')
    expect(within(cards[0]).getByText('Newest work')).toBeInTheDocument()
    expect(within(cards[1]).getByText('Older work')).toBeInTheDocument()
    expect(screen.getByText(/Shared read-only history/)).toBeInTheDocument()
    expect(screen.getAllByText('Evidence notes (shared text)')).toHaveLength(2)
    expect(screen.queryByText('Work cycle / version')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add Action|Edit|Complete|Cancel Action/ })).not.toBeInTheDocument()
  })

  it('requires and focuses Follow-up Note exactly when selected', async () => {
    vi.mocked(api.listActionsTaken).mockResolvedValue([])
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'staff'} assignees={[]} />)
    await screen.findByText('No Actions Taken yet')
    fireEvent.click(screen.getByRole('button', { name: 'Add Action Taken' }))
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Check router' } })
    fireEvent.click(screen.getByLabelText('Follow-Up Required'))
    fireEvent.click(screen.getByRole('button', { name: 'Create Action' }))

    const note = await screen.findByLabelText('Follow-up Note')
    expect(note).toHaveFocus()
    expect(note).toHaveAttribute('aria-invalid', 'true')
    expect(api.createActionTaken).not.toHaveBeenCalled()

    fireEvent.click(screen.getByLabelText('Follow-Up Required'))
    expect(screen.queryByLabelText('Follow-up Note')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create Action' }))
    await waitFor(() => expect(api.createActionTaken).toHaveBeenCalledWith(
      ticketNumber,
      expect.objectContaining({ followUpRequired: false, followUpNote: null }),
      expect.any(String),
    ))
  })

  it('preserves entered data and the same idempotency key across a safe retry', async () => {
    vi.mocked(api.listActionsTaken).mockResolvedValue([])
    vi.mocked(api.createActionTaken)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ ...base, id: 14, description: 'Preserved draft' })
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'staff'} assignees={[]} />)
    await screen.findByText('No Actions Taken yet')
    fireEvent.click(screen.getByRole('button', { name: 'Add Action Taken' }))
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Preserved draft' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Action' }))

    expect(await screen.findByDisplayValue('Preserved draft')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('failed safely')
    const firstKey = vi.mocked(api.createActionTaken).mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: 'Create Action' }))
    await screen.findByText('Action created.')
    expect(vi.mocked(api.createActionTaken).mock.calls[1][2]).toBe(firstKey)
  })

  it('prevents repeated clicks while a create request is pending', async () => {
    vi.mocked(api.listActionsTaken).mockResolvedValue([])
    let finish!: (value: api.ActionTaken) => void
    vi.mocked(api.createActionTaken).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'staff'} assignees={[]} />)
    await screen.findByText('No Actions Taken yet')
    fireEvent.click(screen.getByRole('button', { name: 'Add Action Taken' }))
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'One request only' } })
    const submit = screen.getByRole('button', { name: 'Create Action' })
    fireEvent.click(submit)
    fireEvent.click(submit)
    expect(api.createActionTaken).toHaveBeenCalledTimes(1)
    finish({ ...base, id: 15, description: 'One request only' })
    expect(await screen.findByText('Action created.')).toBeInTheDocument()
  })

  it('supports assignment and exposes stale completion recovery without losing the result', async () => {
    vi.mocked(api.completeActionTaken).mockRejectedValueOnce(
      new api.ActionsTakenError('STALE_RESOURCE', 'stale'),
    )
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'staff'} assignees={[
      { id: 9, name: 'Suda', role: 'IT_STAFF' },
      { id: 10, name: 'Mali', role: 'ADMINISTRATOR' },
    ]} />)
    await screen.findByText(base.description)

    fireEvent.change(screen.getByLabelText('Reassign Action #12'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Assignment' }))
    await waitFor(() => expect(api.assignActionTaken).toHaveBeenCalledWith(ticketNumber, 12, 10, 3))

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Complete Action' }))
    await waitFor(() => expect(screen.getByLabelText(/Result/)).toHaveFocus())
    fireEvent.change(screen.getByLabelText(/Result/), { target: { value: 'Keep this result' } })
    fireEvent.click(screen.getByRole('button', { name: 'Complete Action' }))
    expect(await screen.findByDisplayValue('Keep this result')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload latest' })).toBeInTheDocument()
  })

  it('connects edit, start, and confirmed cancel controls to version-bound API calls', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'staff'} assignees={[]} />)
    await screen.findByText(base.description)

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Edited description' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    await waitFor(() => expect(api.editActionTaken).toHaveBeenCalledWith(
      ticketNumber,
      12,
      expect.objectContaining({ description: 'Edited description', expectedVersion: 3 }),
    ))

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(api.transitionActionTaken).toHaveBeenCalledWith(ticketNumber, 12, 'start', 4))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel Action' }))
    expect(window.confirm).toHaveBeenCalledWith('Cancel Action 12? This is terminal.')
    await waitFor(() => expect(api.transitionActionTaken).toHaveBeenCalledWith(ticketNumber, 12, 'cancel', 4))
  })

  it('announces a safe list failure and retries without exposing exception details', async () => {
    vi.mocked(api.listActionsTaken)
      .mockRejectedValueOnce(new Error('database hostname leaked'))
      .mockResolvedValueOnce([])
    render(<ActionsTakenSection ticketNumber={ticketNumber} mode={'requester'} />)
    expect(await screen.findByText(/failed safely/)).toHaveAttribute('role', 'status')
    expect(screen.queryByText('database hostname leaked')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry Actions Taken' }))
    expect(await screen.findByText('No Actions Taken yet')).toBeInTheDocument()
  })
})
