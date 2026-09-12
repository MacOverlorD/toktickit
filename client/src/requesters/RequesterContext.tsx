import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '../auth/AuthContext'

interface AuthenticatedRequester {
  id: number
  name: string
  email: string
}

interface RequesterContextValue {
  selectedRequester: AuthenticatedRequester | null
  contextVersion: number
  hasUnsavedTicketDraft: boolean
  isTicketSubmitting: boolean
  confirmTicketNavigation: () => boolean
  setTicketDraftState: (hasDraft: boolean, isSubmitting: boolean) => void
}

const RequesterContext = createContext<RequesterContextValue | null>(null)

export function RequesterProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth()
  const selectedRequester =
    state.status === 'authenticated' && state.payload.user.role === 'REQUESTER'
      ? {
          id: state.payload.user.id,
          name: state.payload.user.name,
          email: state.payload.user.email,
        }
      : null
  const contextVersion =
    state.status === 'authenticated' ? state.payload.user.version : 0
  const identityKey =
    state.status === 'authenticated'
      ? `${state.payload.user.id}:${state.payload.user.role}:${contextVersion}`
      : 'anonymous'

  return (
    <RequesterSessionProvider
      key={identityKey}
      contextVersion={contextVersion}
      selectedRequester={selectedRequester}
    >
      {children}
    </RequesterSessionProvider>
  )
}

function RequesterSessionProvider({
  children,
  contextVersion,
  selectedRequester,
}: {
  children: ReactNode
  contextVersion: number
  selectedRequester: AuthenticatedRequester | null
}) {
  const [hasUnsavedTicketDraft, setUnsavedTicketDraft] = useState(false)
  const [isTicketSubmitting, setTicketSubmitting] = useState(false)
  const setTicketDraftState = useCallback(
    (hasDraft: boolean, isSubmitting: boolean) => {
      setUnsavedTicketDraft(hasDraft)
      setTicketSubmitting(isSubmitting)
    },
    [],
  )

  const confirmTicketNavigation = useCallback(() => {
    if (isTicketSubmitting) return false
    if (!hasUnsavedTicketDraft) return true
    return window.confirm('Discard this unsaved ticket and leave this page?')
  }, [hasUnsavedTicketDraft, isTicketSubmitting])

  const value = useMemo(
    () => ({
      selectedRequester,
      contextVersion,
      hasUnsavedTicketDraft,
      isTicketSubmitting,
      confirmTicketNavigation,
      setTicketDraftState,
    }),
    [
      confirmTicketNavigation,
      contextVersion,
      hasUnsavedTicketDraft,
      isTicketSubmitting,
      selectedRequester,
      setTicketDraftState,
    ],
  )

  return (
    <RequesterContext.Provider value={value}>
      {children}
    </RequesterContext.Provider>
  )
}

export function useRequester() {
  const context = useContext(RequesterContext)
  if (!context) {
    throw new Error('useRequester must be used inside RequesterProvider')
  }
  return context
}
