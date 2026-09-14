import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiFetch, setApiCsrfToken } from '../api/request'

export type UserRole = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: UserRole
  isActive: boolean
  mustChangePassword: boolean
  version: number
}

export interface AuthPayload {
  user: AuthUser
  csrfToken: string
  expiresAt: string
}

type AuthState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; payload: AuthPayload }

interface AuthContextValue {
  state: AuthState
  login: (email: string, password: string) => Promise<AuthPayload>
  changePassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => Promise<AuthPayload>
  logout: () => Promise<void>
  restore: () => Promise<void>
}

export class AuthRequestError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: Record<string, string>
  readonly retryAfterSeconds: number | null

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
    retryAfterSeconds: number | null = null,
  ) {
    super(message)
    this.name = 'AuthRequestError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function responseError(response: Response) {
  let body: {
    error?: {
      code?: string
      message?: string
      fieldErrors?: Record<string, string>
    }
  } = {}
  try {
    body = await response.json()
  } catch {
    // Use the safe fallback below.
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  return new AuthRequestError(
    response.status,
    body.error?.code ?? 'REQUEST_FAILED',
    body.error?.message ?? 'The request could not be completed.',
    body.error?.fieldErrors ?? {},
    Number.isInteger(retryAfter) && retryAfter > 0 ? retryAfter : null,
  )
}

function applyPayload(
  payload: AuthPayload,
  setState: (state: AuthState) => void,
) {
  setApiCsrfToken(payload.csrfToken)
  setState({ status: 'authenticated', payload })
  return payload
}

export function AuthProvider({
  children,
  initialPayload,
}: {
  children: ReactNode
  initialPayload?: AuthPayload | null
}) {
  const [state, setState] = useState<AuthState>(() =>
    initialPayload === undefined
      ? { status: 'loading' }
      : initialPayload === null
        ? { status: 'anonymous' }
        : { status: 'authenticated', payload: initialPayload },
  )

  const restore = useCallback(async () => {
    setState({ status: 'loading' })
    try {
      const response = await apiFetch('/api/auth/me')
      if (!response.ok) {
        setApiCsrfToken(null)
        setState({ status: 'anonymous' })
        return
      }
      applyPayload((await response.json()) as AuthPayload, setState)
    } catch {
      setApiCsrfToken(null)
      setState({ status: 'anonymous' })
    }
  }, [])

  useEffect(() => {
    if (initialPayload === undefined) void restore()
    else if (initialPayload) setApiCsrfToken(initialPayload.csrfToken)
  }, [initialPayload, restore])

  useEffect(() => {
    const clear = () => {
      setApiCsrfToken(null)
      setState({ status: 'anonymous' })
    }
    window.addEventListener('toktickit:unauthenticated', clear)
    return () => window.removeEventListener('toktickit:unauthenticated', clear)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) throw await responseError(response)
    return applyPayload((await response.json()) as AuthPayload, setState)
  }, [])

  const changePassword = useCallback(async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) => {
    const response = await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    })
    if (!response.ok) throw await responseError(response)
    return applyPayload((await response.json()) as AuthPayload, setState)
  }, [])

  const logout = useCallback(async () => {
    const response = await apiFetch('/api/auth/logout', { method: 'POST' })
    if (!response.ok) throw await responseError(response)
    setApiCsrfToken(null)
    setState({ status: 'anonymous' })
  }, [])

  const value = useMemo(
    () => ({ state, login, changePassword, logout, restore }),
    [changePassword, login, logout, restore, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function roleHome(role: UserRole) {
  return role === 'REQUESTER' ? '/tickets' : role === 'ADMINISTRATOR' ? '/admin/users' : '/staff/tickets'
}
