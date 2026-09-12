import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/App'
import { setApiCsrfToken } from '../../src/api/request'
import type { AuthPayload, UserRole } from '../../src/auth/AuthContext'

function payload(
  role: UserRole,
  mustChangePassword = false,
): AuthPayload {
  return {
    user: {
      id: role === 'REQUESTER' ? 1 : role === 'IT_STAFF' ? 3 : 4,
      name: role === 'REQUESTER' ? 'Anan Wong' : role === 'IT_STAFF' ? 'Suda Staff' : 'Arthit Admin',
      email: role.toLowerCase() + '@example.test',
      role,
      isActive: true,
      mustChangePassword,
      version: 2,
    },
    csrfToken: 'c'.repeat(64),
    expiresAt: '2026-09-11T18:00:00.000Z',
  }
}

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

beforeEach(() => {
  window.history.replaceState({}, '', '/login')
  setApiCsrfToken(null)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  setApiCsrfToken(null)
  window.history.replaceState({}, '', '/')
})

describe('Lab 3 authentication UI', () => {
  it('shows and hides the password and uses one generic credential failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(401, {
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      },
    }))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={null} />)

    const password = screen.getByLabelText(/^Password/)
    expect(password).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')

    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'unknown@example.test' },
    })
    fireEvent.change(password, { target: { value: 'incorrect password' } })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Cannot sign in with these credentials',
    )
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:3000/api/auth/login')
    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
  })

  it('routes a successful login to the home for the authenticated role', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(200, payload('IT_STAFF'))))
    render(<App initialAuth={null} />)

    fireEvent.change(screen.getByLabelText(/^Email/), {
      target: { value: 'suda.staff@example.test' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/), {
      target: { value: 'correct horse battery staple' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Ticket Queue' }))
      .toBeInTheDocument()
    expect(window.location.pathname).toBe('/staff/tickets')
  })

  it('forces restricted sessions through password change and sends CSRF', async () => {
    window.history.replaceState({}, '', '/staff/tickets')
    const next = payload('IT_STAFF')
    const fetchMock = vi.fn().mockResolvedValue(response(200, next))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={payload('IT_STAFF', true)} />)

    expect(await screen.findByRole('heading', { name: 'Change password' }))
      .toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Current password/), {
      target: { value: 'Initial password value' },
    })
    fireEvent.change(screen.getByLabelText(/^New password/), {
      target: { value: 'A sufficiently long new password' },
    })
    fireEvent.change(screen.getByLabelText(/^Confirm new password/), {
      target: { value: 'different value' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(screen.getByText('Password confirmation must match.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/^Confirm new password/), {
      target: { value: 'A sufficiently long new password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save password' }))

    expect(await screen.findByRole('heading', { name: 'Ticket Queue' }))
      .toBeInTheDocument()
    const [, init] = fetchMock.mock.calls[0]
    expect(init).toEqual(expect.objectContaining({
      method: 'POST',
      credentials: 'include',
    }))
    expect((init.headers as Headers).get('X-CSRF-Token')).toBe('c'.repeat(64))
  })

  it('allows a restricted user to log out before changing the initial password', async () => {
    window.history.replaceState({}, '', '/change-password')
    const fetchMock = vi.fn().mockResolvedValue(response(204, null))
    vi.stubGlobal('fetch', fetchMock)
    render(<App initialAuth={payload('REQUESTER', true)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Sign in' }))
      .toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
  })

  it('shows only role-appropriate navigation and blocks direct role escalation', async () => {
    window.history.replaceState({}, '', '/staff/tickets')
    const view = render(<App initialAuth={payload('ADMINISTRATOR')} />)

    expect(screen.getByRole('link', { name: 'Ticket Queue' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'My Tickets' })).not.toBeInTheDocument()

    view.unmount()
    window.history.replaceState({}, '', '/admin/users')
    render(<App initialAuth={payload('IT_STAFF')} />)

    expect(await screen.findByText('Forbidden')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/admin/users'))
  })
})
