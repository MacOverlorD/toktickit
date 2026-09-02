import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from '../../src/api/development-requesters'
import { DEVELOPMENT_REQUESTER_STORAGE_KEY } from '../../src/requesters/RequesterContext'

vi.mock('../../src/api/development-requesters', () => ({
  getDevelopmentRequesters: vi.fn(),
}))

const requesters: DevelopmentRequester[] = [
  { id: 1, name: 'Anan Wong', email: 'anan.wong@example.test' },
  { id: 2, name: 'Mali Chaiyasit', email: 'mali.chaiyasit@example.test' },
]

beforeEach(() => {
  window.history.replaceState({}, '', '/select-requester')
  sessionStorage.clear()
  vi.mocked(getDevelopmentRequesters).mockReset()
})

afterEach(() => {
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('Development Requester selection', () => {
  it('shows the testing-only notice and loading state while active requesters load', () => {
    vi.mocked(getDevelopmentRequesters).mockReturnValue(
      new Promise(() => {
        // Keep the API pending to assert the visible loading contract.
      }),
    )

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Select Development Requester' }))
      .toBeInTheDocument()
    expect(screen.getByText(/This is not a secure login/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Loading requesters')
  })

  it('loads options, keeps Continue disabled, then revalidates before navigation', async () => {
    vi.mocked(getDevelopmentRequesters).mockResolvedValue(requesters)

    render(<App />)

    const select = await screen.findByRole('combobox', {
      name: /Development Requester/,
    })
    const continueButton = screen.getByRole('button', { name: 'Continue' })

    expect(continueButton).toBeDisabled()
    expect(screen.getByRole('option', { name: /Anan Wong/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Former Requester/ })).not.toBeInTheDocument()

    fireEvent.change(select, { target: { value: '1' } })
    expect(continueButton).toBeEnabled()
    fireEvent.click(continueButton)

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByText('Anan Wong')).toBeInTheDocument()
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBe('1')
    expect(getDevelopmentRequesters).toHaveBeenCalledTimes(2)
  })

  it('shows the empty state without an available Continue action', async () => {
    vi.mocked(getDevelopmentRequesters).mockResolvedValue([])

    render(<App />)

    expect(await screen.findByText('No active requesters')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument()
  })

  it('shows a safe failure and retries the requester query', async () => {
    vi.mocked(getDevelopmentRequesters)
      .mockRejectedValueOnce(new Error('database hostname leaked'))
      .mockResolvedValueOnce(requesters)

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Requesters unavailable')
    expect(screen.queryByText('database hostname leaked')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('combobox', { name: /Development Requester/ }))
      .toBeInTheDocument()
    expect(getDevelopmentRequesters).toHaveBeenCalledTimes(2)
  })

  it('rejects a requester that becomes inactive before Continue', async () => {
    vi.mocked(getDevelopmentRequesters)
      .mockResolvedValueOnce(requesters)
      .mockResolvedValueOnce([requesters[0]])

    render(<App />)

    const select = await screen.findByRole('combobox', {
      name: /Development Requester/,
    })
    fireEvent.change(select, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(/no longer active/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBeNull()
  })
})
