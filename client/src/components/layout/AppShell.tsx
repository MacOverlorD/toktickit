import {
  KeyRound,
  List,
  LogOut,
  Menu,
  TicketPlus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { useRequester } from '../../requesters/RequesterContext'
import { zenGreenCssProperties } from '../../styles/tokens'

function navigationClass({ isActive }: { isActive: boolean }) {
  return 'app-nav-link' + (isActive ? ' is-active' : '')
}

function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, state } = useAuth()
  const {
    contextVersion,
    confirmTicketNavigation,
    isTicketSubmitting,
  } = useRequester()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  if (state.status !== 'authenticated') return null
  const user = state.payload.user

  function guardTicketNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!confirmTicketNavigation()) event.preventDefault()
  }

  async function signOut() {
    if (!confirmTicketNavigation()) return
    setLogoutBusy(true)
    setLogoutError('')
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch {
      setLogoutError('Sign out failed. Try again.')
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <div className={'app-shell'} style={zenGreenCssProperties}>
      <a className={'skip-link'} href={'#main-content'}>
        Skip to main content
      </a>
      <header className={'app-topbar'}>
        <div className={'topbar-inner'}>
          <Link
            className={'brand-link'}
            to={'/'}
            aria-label={'TokTickIT home'}
            aria-disabled={isTicketSubmitting || undefined}
            onClick={guardTicketNavigation}
          >
            <span className={'brand-mark'} aria-hidden={'true'}>T</span>
            <span>
              <span className={'brand-name'}>TokTickIT</span>
              <span className={'brand-subtitle'}>IT Service Desk</span>
            </span>
          </Link>

          <button
            className={'mobile-menu-button'}
            type={'button'}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-controls={'primary-navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            {menuOpen ? <X aria-hidden={'true'} /> : <Menu aria-hidden={'true'} />}
            <span>{menuOpen ? 'Close' : 'Menu'}</span>
          </button>

          <div
            className={'topbar-content' + (menuOpen ? ' is-open' : '')}
            id={'primary-navigation'}
          >
            <nav className={'app-navigation'} aria-label={'Primary navigation'}>
              {user.role === 'REQUESTER' && (
                <>
                  <NavLink
                    className={navigationClass}
                    to={'/tickets'}
                    end
                    aria-disabled={isTicketSubmitting || undefined}
                    onClick={guardTicketNavigation}
                  >
                    <List aria-hidden={'true'} />
                    <span>My Tickets</span>
                  </NavLink>
                  <NavLink
                    className={navigationClass}
                    to={'/tickets/new'}
                    aria-disabled={isTicketSubmitting || undefined}
                    onClick={guardTicketNavigation}
                  >
                    <TicketPlus aria-hidden={'true'} />
                    <span>Create Ticket</span>
                  </NavLink>
                </>
              )}
              {(user.role === 'IT_STAFF' || user.role === 'ADMINISTRATOR') && (
                <NavLink className={navigationClass} to={'/staff/tickets'}>
                  <List aria-hidden={'true'} />
                  <span>Ticket Queue</span>
                </NavLink>
              )}
              {user.role === 'ADMINISTRATOR' && (
                <NavLink className={navigationClass} to={'/admin/users'}>
                  <Users aria-hidden={'true'} />
                  <span>Users</span>
                </NavLink>
              )}
            </nav>

            <div className={'requester-identity'}>
              <UserRound aria-hidden={'true'} />
              <span className={'requester-copy'}>
                <span className={'requester-label'}>
                  {roleLabel(user.role)}
                </span>
                <span className={'requester-name'}>{user.name}</span>
              </span>
              <Link
                className={'requester-action'}
                to={'/change-password'}
                onClick={guardTicketNavigation}
              >
                <KeyRound aria-hidden={'true'} />
                Change password
              </Link>
              <button
                className={'requester-action auth-logout'}
                disabled={logoutBusy}
                type={'button'}
                onClick={() => void signOut()}
              >
                <LogOut aria-hidden={'true'} />
                {logoutBusy ? 'Signing out...' : 'Log out'}
              </button>
            </div>
          </div>
        </div>
        {logoutError && <p className={'topbar-error'} role={'alert'}>{logoutError}</p>}
      </header>

      <main id={'main-content'} tabIndex={-1} key={contextVersion}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
