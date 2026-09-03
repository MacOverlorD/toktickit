import { List, Menu, TicketPlus, UserRound, X } from 'lucide-react'
import { useEffect, useState, type MouseEvent } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useRequester } from '../../requesters/RequesterContext'
import { zenGreenCssProperties } from '../../styles/tokens'

function navigationClass({ isActive }: { isActive: boolean }) {
  return `app-nav-link${isActive ? ' is-active' : ''}`
}

function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const {
    contextVersion,
    confirmTicketNavigation,
    isTicketSubmitting,
    selectedRequester,
  } = useRequester()

  function guardTicketNavigation(event: MouseEvent<HTMLAnchorElement>) {
    if (!confirmTicketNavigation()) event.preventDefault()
  }

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
            className={`topbar-content${menuOpen ? ' is-open' : ''}`}
            id={'primary-navigation'}
          >
            <nav className={'app-navigation'} aria-label={'Primary navigation'}>
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
              <NavLink className={navigationClass} to={'/tickets/new'}>
                <TicketPlus aria-hidden={'true'} />
                <span>Create Ticket</span>
              </NavLink>
            </nav>

            <div className={'requester-identity'}>
              <UserRound aria-hidden={'true'} />
              <span className={'requester-copy'}>
                <span className={'requester-label'}>Lab 2 testing user</span>
                <span className={'requester-name'}>
                  {selectedRequester?.name ?? 'Not selected'}
                </span>
              </span>
              <Link
                className={'requester-action'}
                to={'/select-requester'}
                aria-label={
                  selectedRequester
                    ? `Change Development Requester. Current requester: ${selectedRequester.name}`
                    : 'Select Development Requester'
                }
                aria-disabled={isTicketSubmitting || undefined}
                onClick={guardTicketNavigation}
              >
                {selectedRequester ? 'Change requester' : 'Select requester'}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main id={'main-content'} tabIndex={-1} key={contextVersion}>
        <Outlet />
      </main>
    </div>
  )
}

export default AppShell
