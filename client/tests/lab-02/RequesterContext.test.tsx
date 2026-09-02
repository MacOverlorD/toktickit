import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
  sessionStorage.clear()
  vi.mocked(getDevelopmentRequesters).mockReset()
})

afterEach(() => {
  sessionStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('Development Requester context', () => {
  it('restores and revalidates a tab-scoped requester before showing ticket routes', async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
    window.history.replaceState({}, '', '/tickets')
    vi.mocked(getDevelopmentRequesters).mockResolvedValue(requesters)

    render(<App />)

    expect(screen.getByRole('status')).toHaveTextContent('Verifying requester')
    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByText('Lab 2 testing user')).toBeInTheDocument()
    expect(screen.getByText('Anan Wong')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Change Development Requester/ }),
    ).toBeInTheDocument()
  })

  it.each([
    ['stale', '999'],
    ['malformed', 'not-an-id'],
  ])('clears a %s stored requester and redirects to selection', async (_case, storedId) => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, storedId)
    window.history.replaceState({}, '', '/tickets/secret-ticket')
    vi.mocked(getDevelopmentRequesters).mockResolvedValue(requesters)

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Select Development Requester' }))
      .toBeInTheDocument()
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBeNull()
    expect(screen.queryByText('Ticket Detail')).not.toBeInTheDocument()
  })

  it('switches requester, clears the prior identity, and returns to My Tickets', async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
    window.history.replaceState({}, '', '/select-requester')
    vi.mocked(getDevelopmentRequesters).mockResolvedValue(requesters)

    render(<App />)

    const select = await screen.findByRole('combobox', {
      name: /Development Requester/,
    })
    await waitFor(() => expect(select).toHaveValue('1'))
    const priorRequesterView = screen.getByRole('main')

    fireEvent.change(select, { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
    expect(screen.getByText('Mali Chaiyasit')).toBeInTheDocument()
    expect(screen.queryByText('Anan Wong')).not.toBeInTheDocument()
    expect(sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)).toBe('2')
    expect(screen.getByRole('main')).not.toBe(priorRequesterView)
  })

  it('keeps ticket content hidden and offers Retry when restoration cannot be verified', async () => {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, '1')
    window.history.replaceState({}, '', '/tickets')
    vi.mocked(getDevelopmentRequesters)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce(requesters)

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Requester verification unavailable',
    )
    expect(screen.queryByRole('heading', { name: 'My Tickets' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByRole('heading', { name: 'My Tickets' })).toBeInTheDocument()
  })
})
