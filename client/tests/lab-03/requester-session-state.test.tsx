import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AuthProvider,
  type AuthPayload,
  useAuth,
} from '../../src/auth/AuthContext'
import {
  RequesterProvider,
  useRequester,
} from '../../src/requesters/RequesterContext'
import { setApiCsrfToken } from '../../src/api/request'

const first: AuthPayload = {
  user: {
    id: 101,
    name: 'First Requester',
    email: 'first@example.test',
    role: 'REQUESTER',
    isActive: true,
    mustChangePassword: false,
    version: 3,
  },
  csrfToken: 'a'.repeat(64),
  expiresAt: '2026-09-12T18:00:00.000Z',
}

const second: AuthPayload = {
  user: {
    id: 202,
    name: 'Second Requester',
    email: 'second@example.test',
    role: 'REQUESTER',
    isActive: true,
    mustChangePassword: false,
    version: 3,
  },
  csrfToken: 'b'.repeat(64),
  expiresAt: '2026-09-12T19:00:00.000Z',
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

function Harness() {
  const { login, logout } = useAuth()
  const {
    hasUnsavedTicketDraft,
    selectedRequester,
    setTicketDraftState,
  } = useRequester()

  async function switchIdentity() {
    await logout()
    await login('second@example.test', 'Second requester password')
  }

  return (
    <>
      <p>{selectedRequester?.name ?? 'Anonymous'}</p>
      <p>{hasUnsavedTicketDraft ? 'Draft retained' : 'Draft clear'}</p>
      <button
        onClick={() => setTicketDraftState(true, false)}
        type={'button'}
      >
        Start draft
      </button>
      <button onClick={() => void switchIdentity()} type={'button'}>
        Switch identity
      </button>
    </>
  )
}

afterEach(() => {
  setApiCsrfToken(null)
  vi.restoreAllMocks()
})

describe('Requester session-scoped UI state', () => {
  it('clears draft state when authentication changes to another requester', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(204, null))
      .mockResolvedValueOnce(response(200, second))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AuthProvider initialPayload={first}>
        <RequesterProvider>
          <Harness />
        </RequesterProvider>
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start draft' }))
    expect(screen.getByText('Draft retained')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Switch identity' }))

    await waitFor(() =>
      expect(screen.getByText('Second Requester')).toBeInTheDocument(),
    )
    expect(screen.getByText('Draft clear')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
