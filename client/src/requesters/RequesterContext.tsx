import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getDevelopmentRequesters,
  type DevelopmentRequester,
} from '../api/development-requesters'

export const DEVELOPMENT_REQUESTER_STORAGE_KEY = 'toktickit.devRequesterId'

type RequesterLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

interface RequesterContextValue {
  requesters: DevelopmentRequester[]
  selectedRequester: DevelopmentRequester | null
  loadStatus: RequesterLoadStatus
  contextVersion: number
  refreshRequesters: () => Promise<DevelopmentRequester[]>
  validateAndSelectRequester: (requesterId: number) => Promise<boolean>
}

const RequesterContext = createContext<RequesterContextValue | null>(null)

function removeStoredRequesterId() {
  try {
    sessionStorage.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)
  } catch {
    // A blocked storage API behaves like an unavailable requester context.
  }
}

function readStoredRequesterId() {
  try {
    const storedValue = sessionStorage.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY)
    if (storedValue === null) return null

    if (!/^[1-9]\d*$/.test(storedValue)) {
      removeStoredRequesterId()
      return null
    }

    const requesterId = Number(storedValue)
    if (!Number.isSafeInteger(requesterId)) {
      removeStoredRequesterId()
      return null
    }

    return requesterId
  } catch {
    return null
  }
}

function storeRequesterId(requesterId: number) {
  try {
    sessionStorage.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, String(requesterId))
    return true
  } catch {
    return false
  }
}

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [initialStoredRequesterId] = useState(readStoredRequesterId)
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([])
  const [selectedRequester, setSelectedRequester] =
    useState<DevelopmentRequester | null>(null)
  const [loadStatus, setLoadStatus] = useState<RequesterLoadStatus>(
    initialStoredRequesterId === null ? 'idle' : 'loading',
  )
  const [contextVersion, setContextVersion] = useState(0)

  const applyRequesterList = useCallback((requesterList: DevelopmentRequester[]) => {
    setRequesters(requesterList)

    const storedRequesterId = readStoredRequesterId()
    const restoredRequester =
      storedRequesterId === null
        ? null
        : requesterList.find(({ id }) => id === storedRequesterId) ?? null

    if (storedRequesterId !== null && !restoredRequester) {
      removeStoredRequesterId()
    }

    setSelectedRequester(restoredRequester)
    return restoredRequester
  }, [])

  const refreshRequesters = useCallback(async () => {
    setLoadStatus('loading')

    try {
      const requesterList = await getDevelopmentRequesters()
      applyRequesterList(requesterList)
      setLoadStatus('ready')
      return requesterList
    } catch (error) {
      setLoadStatus('error')
      throw error
    }
  }, [applyRequesterList])

  const validateAndSelectRequester = useCallback(
    async (requesterId: number) => {
      const requesterList = await getDevelopmentRequesters()
      const requester = requesterList.find(({ id }) => id === requesterId) ?? null

      setRequesters(requesterList)
      if (!requester || !storeRequesterId(requester.id)) {
        if (!requester) removeStoredRequesterId()
        setSelectedRequester(null)
        return false
      }

      setSelectedRequester(requester)
      setLoadStatus('ready')
      setContextVersion((version) => version + 1)
      return true
    },
    [],
  )

  useEffect(() => {
    if (initialStoredRequesterId !== null) {
      void refreshRequesters().catch(() => undefined)
    }
  }, [initialStoredRequesterId, refreshRequesters])

  const value = useMemo(
    () => ({
      requesters,
      selectedRequester,
      loadStatus,
      contextVersion,
      refreshRequesters,
      validateAndSelectRequester,
    }),
    [
      contextVersion,
      loadStatus,
      refreshRequesters,
      requesters,
      selectedRequester,
      validateAndSelectRequester,
    ],
  )

  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>
}

export function useRequester() {
  const context = useContext(RequesterContext)
  if (!context) {
    throw new Error('useRequester must be used inside RequesterProvider')
  }
  return context
}
