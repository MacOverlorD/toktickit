import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { getCategories } from '../../src/api/categories'
import { getDevelopmentRequesters } from '../../src/api/development-requesters'
import { getRelatedSystems } from '../../src/api/related-systems'
import { createTicket, TicketApiError } from '../../src/api/tickets'
import { DEVELOPMENT_REQUESTER_STORAGE_KEY } from '../../src/requesters/RequesterContext'

vi.mock('../../src/api/categories', () => ({ getCategories: vi.fn() }))
vi.mock('../../src/api/development-requesters', () => ({
  getDevelopmentRequesters: vi.fn(),
}))
vi.mock('../../src/api/related-systems', () => ({
  getRelatedSystems: vi.fn(),
}))
vi.mock('../../src/api/tickets', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/api/tickets')>()
  return { ...original, createTicket: vi.fn() }
})

const requester = {
  id: 1,
  name: 'Anan Wong',
  email: 'anan.wong@example.test',
}
const created = {
  data: {
    ticketNumber: 'TKT-20260902-A1B2C3D4',
    ticketDate: '2026-09-02T10:00:00.000Z',
    status: 'NEW' as const,
    requesterId: 1,
  },
  replayed: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
  window.history.replaceState({}, '', '/tickets/new')
  vi.mocked(getDevelopmentRequesters).mockResolvedValue([requester])
  vi.mocked(getCategories).mockResolvedValue([
    { id: 2, name: 'Hardware' },
    { id: 3, name: 'Software' },
  ])
  vi.mocked(getRelatedSystems).mockResolvedValue([
    { id: 7, name: 'Corporate Laptop' },
    { id: 8, name: 'Email' },
  ])
  vi.mocked(createTicket).mockResolvedValue(created)
})

async function renderReadyForm() {
  render(<App />)
  await screen.findByRole('option', { name: 'Hardware' })
}

function fillValidForm() {
  fireEvent.change(screen.getByRole('combobox', { name: /Category/ }), {
    target: { value: '2' },
  })
  fireEvent.change(screen.getByRole('combobox', { name: /Related System/ }), {
    target: { value: '7' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: /Ticket Summary/ }), {
    target: { value: '  Laptop battery drains quickly  ' },
  })
  fireEvent.change(screen.getByRole('combobox', { name: /Requested Priority/ }), {
    target: { value: 'MEDIUM' },
  })
  fireEvent.change(screen.getByRole('textbox', { name: /Description/ }), {
    target: { value: '  Battery capacity drops from full to empty in one hour.  ' },
  })
}

describe('Create Ticket screen', () => {
  it('shows loading then every required field with derived values read-only', async () => {
    let resolveCategories: (value: { id: number; name: string }[]) => void
    vi.mocked(getCategories).mockReturnValue(
      new Promise((resolve) => {
        resolveCategories = resolve
      }),
    )

    render(<App />)
    expect(await screen.findByText('Loading ticket options')).toBeInTheDocument()
    resolveCategories!([{ id: 2, name: 'Hardware' }])

    await screen.findByRole('option', { name: 'Hardware' })
    expect(screen.getByRole('combobox', { name: /Category/ })).toBeEnabled()
    expect(screen.getByDisplayValue('Assigned after submission')).toHaveAttribute(
      'readonly',
    )
    expect(
      screen.getByDisplayValue('Assigned by server after submission'),
    ).toHaveAttribute('readonly')
    expect(
      screen.getByDisplayValue('Anan Wong (anan.wong@example.test)'),
    ).toHaveAttribute('readonly')
    expect(screen.getByRole('textbox', { name: /Ticket Summary/ })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /Description/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Attachments (optional)')).toBeInTheDocument()
  })

  it('retries reference loading after a safe failure', async () => {
    vi.mocked(getCategories)
      .mockRejectedValueOnce(new Error('database details'))
      .mockResolvedValueOnce([{ id: 2, name: 'Hardware' }])

    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ticket options unavailable',
    )
    expect(screen.queryByText('database details')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('option', { name: 'Hardware' })).toBeInTheDocument()
  })

  it('shows field validation and focuses the first invalid control', async () => {
    await renderReadyForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))

    expect(screen.getByText('Select a Category.')).toBeInTheDocument()
    expect(screen.getByText('Select a Related System.')).toBeInTheDocument()
    expect(screen.getByText(/Ticket Summary must be 5-120/)).toBeInTheDocument()
    expect(screen.getByText(/Description must be 10-5,000/)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Category/ })).toHaveFocus()
    })
    expect(createTicket).not.toHaveBeenCalled()
  })

  it('normalizes form data, derives requester identity, and blocks a double submit', async () => {
    let resolveCreate: (value: typeof created) => void
    vi.mocked(createTicket).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    await renderReadyForm()
    fillValidForm()
    const button = screen.getByRole('button', { name: 'Create Ticket' })
    fireEvent.click(button)
    fireEvent.click(button)

    expect(createTicket).toHaveBeenCalledTimes(1)
    expect(createTicket).toHaveBeenCalledWith(
      {
        categoryId: 2,
        relatedSystemId: 7,
        summary: 'Laptop battery drains quickly',
        requestedPriority: 'MEDIUM',
        description: 'Battery capacity drops from full to empty in one hour.',
      },
      requester.id,
      expect.stringMatching(/^[0-9a-f-]{36}$/i),
    )
    expect(screen.getByRole('button', { name: 'Creating ticket...' })).toBeDisabled()
    resolveCreate!(created)
    expect(await screen.findByRole('heading', { name: 'Ticket created' })).toBeInTheDocument()
  })

  it('preserves values and the idempotency key for retry after failure', async () => {
    vi.mocked(createTicket)
      .mockRejectedValueOnce(new TicketApiError())
      .mockResolvedValueOnce(created)
    await renderReadyForm()
    fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your entries are still available',
    )
    expect(screen.getByRole('textbox', { name: /Ticket Summary/ })).toHaveValue(
      '  Laptop battery drains quickly  ',
    )
    const firstKey = vi.mocked(createTicket).mock.calls[0][2]
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))
    expect(await screen.findByText('TKT-20260902-A1B2C3D4')).toBeInTheDocument()
    expect(vi.mocked(createTicket).mock.calls[1][2]).toBe(firstKey)
  })

  it('shows backend field errors beside their controls', async () => {
    vi.mocked(createTicket).mockRejectedValueOnce(
      new TicketApiError('VALIDATION_ERROR', 'Invalid', {
        categoryId: 'Select an active Category.',
      }),
    )
    await renderReadyForm()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))

    expect(await screen.findByText('Select an active Category.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /Category/ })).toHaveFocus()
    })
  })

  it('creates a new idempotency key when form data changes after failure', async () => {
    vi.mocked(createTicket).mockRejectedValue(new TicketApiError())
    await renderReadyForm()
    fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))
    await screen.findByRole('alert')
    const firstKey = vi.mocked(createTicket).mock.calls[0][2]

    fireEvent.change(screen.getByRole('textbox', { name: /Ticket Summary/ }), {
      target: { value: 'A changed valid ticket summary' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(vi.mocked(createTicket).mock.calls[1][2]).not.toBe(firstKey)
  })

  it('confirms before changing requester when the form has an unsaved draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderReadyForm()
    fireEvent.change(screen.getByRole('textbox', { name: /Ticket Summary/ }), {
      target: { value: 'Unsaved ticket summary' },
    })

    fireEvent.click(
      screen.getByRole('link', { name: /Change Development Requester/ }),
    )
    expect(confirm).toHaveBeenCalledWith(
      'Discard this unsaved ticket and leave this page?',
    )
    expect(window.location.pathname).toBe('/tickets/new')

    confirm.mockReturnValue(true)
    fireEvent.click(
      screen.getByRole('link', { name: /Change Development Requester/ }),
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Select Development Requester',
      }),
    ).toBeInTheDocument()
  })

  it('blocks Cancel and My Tickets navigation while creation is pending', async () => {
    let resolveCreate: (value: typeof created) => void
    vi.mocked(createTicket).mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      }),
    )
    const confirm = vi.spyOn(window, 'confirm')
    await renderReadyForm()
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: 'Create Ticket' }))

    await screen.findByRole('button', { name: 'Creating ticket...' })
    const cancelLink = screen.getByRole('link', { name: 'Cancel' })
    const myTicketsLink = screen.getByRole('link', { name: 'My Tickets' })
    expect(cancelLink).toHaveAttribute('aria-disabled', 'true')
    expect(myTicketsLink).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(cancelLink)
    fireEvent.click(myTicketsLink)

    expect(window.location.pathname).toBe('/tickets/new')
    expect(confirm).not.toHaveBeenCalled()
    resolveCreate!(created)
    expect(
      await screen.findByRole('heading', { name: 'Ticket created' }),
    ).toBeInTheDocument()
  })

  it('keeps invalid files visible and allows removing a selection', async () => {
    await renderReadyForm()
    const unsupported = new File(['text'], 'notes.txt', { type: 'text/plain' })
    const oversized = new File(['image'], 'large.png', { type: 'image/png' })
    Object.defineProperty(oversized, 'size', { value: 5 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByLabelText('Attachments (optional)'), {
      target: { files: [unsupported, oversized] },
    })

    const list = screen.getByRole('list', { name: 'Selected attachments' })
    expect(within(list).getByText('notes.txt')).toBeInTheDocument()
    expect(within(list).getByText(/matching file extension/)).toBeInTheDocument()
    expect(within(list).getByText(/exceeds the 5 MiB/)).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove notes.txt from selection',
      }),
    )
    expect(screen.queryByText('notes.txt')).not.toBeInTheDocument()
  })

  it('ignores duplicate files and rejects selections beyond five', async () => {
    await renderReadyForm()
    const files = Array.from(
      { length: 6 },
      (_, index) =>
        new File(['pdf'], 'file-' + index + '.pdf', {
          type: 'application/pdf',
          lastModified: index,
        }),
    )
    fireEvent.change(screen.getByLabelText('Attachments (optional)'), {
      target: { files },
    })
    expect(screen.getByText('A maximum of five files can be selected.')).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Selected attachments' }))
        .getAllByRole('listitem'),
    ).toHaveLength(5)

    fireEvent.click(screen.getByRole('button', { name: /Remove file-4.pdf/ }))
    fireEvent.change(screen.getByLabelText('Attachments (optional)'), {
      target: { files: [files[0]] },
    })
    expect(screen.getByText('A duplicate file selection was ignored.')).toBeInTheDocument()
  })
})
