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

const staff: AuthPayload = {
  ...second,
  user: { ...second.user, role: 'IT_STAFF' },
  csrfToken: 'c'.repeat(64),
}

const newerStaff: AuthPayload = {
  ...staff,
  user: { ...staff.user, version: 4 },
  csrfToken: 'd'.repeat(64),
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
  const { login, state } = useAuth()
  const {
    contextVersion,
    hasUnsavedTicketDraft,
    isTicketSubmitting,
    selectedRequester,
    setTicketDraftState,
  } = useRequester()

  return (
    <>
      <p>Identity: {state.status === 'authenticated' ? state.payload.user.id : 'none'}</p>
      <p>Role: {state.status === 'authenticated' ? state.payload.user.role : 'none'}</p>
      <p>Version: {contextVersion}</p>
      <p>Requester: {selectedRequester?.name ?? 'none'}</p>
      <p>{hasUnsavedTicketDraft ? 'Draft retained' : 'Draft clear'}</p>
      <p>{isTicketSubmitting ? 'Submission active' : 'Submission clear'}</p>
      <button onClick={() => setTicketDraftState(true, true)} type={'button'}>
        Start submission
      </button>
      <button onClick={() => void login('second@example.test', 'password')} type={'button'}>
        Change ID
      </button>
      <button onClick={() => void login('staff@example.test', 'password')} type={'button'}>
        Change role
      </button>
      <button onClick={() => void login('newer@example.test', 'password')} type={'button'}>
        Change version
      </button>
    </>
  )
}

afterEach(() => {
  setApiCsrfToken(null)
  vi.restoreAllMocks()
})

describe('Requester session-scoped UI state', () => {
  it('clears draft and submission state across ID, role, and version transitions', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(200, second))
      .mockResolvedValueOnce(response(200, staff))
      .mockResolvedValueOnce(response(200, newerStaff))
    vi.stubGlobal('fetch', fetchMock)

    render(
      <AuthProvider initialPayload={first}>
        <RequesterProvider>
          <Harness />
        </RequesterProvider>
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Start submission' }))
    expect(screen.getByText('Draft retained')).toBeInTheDocument()
    expect(screen.getByText('Submission active')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Change ID' }))
    await waitFor(() => expect(screen.getByText('Identity: 202')).toBeInTheDocument())
    expect(screen.getByText('Draft clear')).toBeInTheDocument()
    expect(screen.getByText('Submission clear')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start submission' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change role' }))
    await waitFor(() => expect(screen.getByText('Role: IT_STAFF')).toBeInTheDocument())
    expect(screen.getByText('Draft clear')).toBeInTheDocument()
    expect(screen.getByText('Submission clear')).toBeInTheDocument()
    expect(screen.getByText('Requester: none')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start submission' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change version' }))
    await waitFor(() => expect(screen.getByText('Version: 4')).toBeInTheDocument())
    expect(screen.getByText('Draft clear')).toBeInTheDocument()
    expect(screen.getByText('Submission clear')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
