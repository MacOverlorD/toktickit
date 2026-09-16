import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, roleHome, type UserRole } from '../../auth/AuthContext'
import { FeedbackState } from '../ui'

function LoadingSession() {
  return (
    <main className={'auth-page'}>
      <FeedbackState
        variant={'loading'}
        title={'Checking your session'}
        message={'Verifying your TokTickIT account.'}
      />
    </main>
  )
}

export function RequireFullSession() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <LoadingSession />
  if (state.status === 'anonymous') {
    return <Navigate to={'/login'} replace state={{ from: location.pathname }} />
  }
  if (state.payload.user.mustChangePassword) {
    return <Navigate to={'/change-password'} replace />
  }
  return <Outlet />
}

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { state } = useAuth()
  if (state.status !== 'authenticated') return <Navigate to={'/login'} replace />
  if (!roles.includes(state.payload.user.role)) {
    return (
      <div className={'page-container'}>
        <FeedbackState
          variant={'error'}
          title={'Forbidden'}
          message={'Your account does not have access to this page.'}
        />
        <a className={'app-button app-button-secondary'} href={roleHome(state.payload.user.role)}>
          Go to permitted home
        </a>
      </div>
    )
  }
  return <Outlet />
}

export function HomeRedirect() {
  const { state } = useAuth()
  if (state.status !== 'authenticated') return <Navigate to={'/login'} replace />
  return <Navigate to={roleHome(state.payload.user.role)} replace />
}
