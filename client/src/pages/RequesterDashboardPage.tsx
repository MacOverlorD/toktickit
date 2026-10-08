import { ArrowRight, Clock3, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getRequesterDashboard,
  type RequesterDashboardResult,
  type RequesterDashboardTicket,
} from '../api/requester-dashboard'
import { useAuth } from '../auth/AuthContext'
import { AppButton, FeedbackState, TicketBadge } from '../components/ui'

type LoadState = 'loading' | 'ready' | 'error'

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

function MetricCard({
  label,
  value,
  description,
  to,
}: {
  label: string
  value: number
  description: string
  to: string
}) {
  return (
    <article className={'dashboard-metric-card'}>
      <p className={'dashboard-metric-label'}>{label}</p>
      <p className={'dashboard-metric-value'} aria-label={`${label}: ${value}`}>{value}</p>
      <p>{description}</p>
      <Link className={'dashboard-card-link'} to={to}>
        View tickets <ArrowRight aria-hidden={'true'} />
      </Link>
    </article>
  )
}

function DashboardTicketList({
  tickets,
  emptyMessage,
}: {
  tickets: RequesterDashboardTicket[]
  emptyMessage: string
}) {
  if (tickets.length === 0) return <p className={'dashboard-list-empty'}>{emptyMessage}</p>
  return (
    <ul className={'dashboard-ticket-list'}>
      {tickets.map((ticket) => (
        <li key={ticket.ticketNumber}>
          <div className={'dashboard-ticket-heading'}>
            <Link to={`/tickets/${encodeURIComponent(ticket.ticketNumber)}`}>
              {ticket.ticketNumber}
            </Link>
            <TicketBadge kind={'status'} value={ticket.status} />
          </div>
          <p>{ticket.summary}</p>
          <div className={'dashboard-ticket-meta'}>
            <TicketBadge kind={'priority'} value={ticket.requestedPriority} />
            <span><Clock3 aria-hidden={'true'} /> Updated {formatUpdatedAt(ticket.updatedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}

function RequesterDashboardPage() {
  const { state } = useAuth()
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [dashboard, setDashboard] = useState<RequesterDashboardResult | null>(null)
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoadState('loading')
    void getRequesterDashboard()
      .then((result) => {
        if (!active) return
        setDashboard(result)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [retryVersion])

  const requesterName = state.status === 'authenticated' ? state.payload.user.name : 'Requester'

  return (
    <div className={'page-container requester-dashboard-page'}>
      <header className={'page-header'}>
        <div>
          <h1>Dashboard</h1>
          <p className={'page-description'}>
            Welcome, {requesterName}. Here is a concise view of your support tickets.
          </p>
        </div>
        <Link className={'app-button app-button-primary'} to={'/tickets/new'}>
          <Plus aria-hidden={'true'} /> Create Ticket
        </Link>
      </header>

      {loadState === 'loading' && (
        <FeedbackState
          variant={'loading'}
          title={'Loading dashboard'}
          message={'Calculating your latest ticket summary.'}
        />
      )}
      {loadState === 'error' && (
        <FeedbackState
          variant={'error'}
          title={'Dashboard unavailable'}
          message={'Your dashboard could not be loaded. Your ticket data remains safe.'}
          action={
            <AppButton
              variant={'secondary'}
              icon={<RefreshCw />}
              onClick={() => setRetryVersion((value) => value + 1)}
            >
              Retry
            </AppButton>
          }
        />
      )}
      {loadState === 'ready' && dashboard && (
        <>
          <section className={'dashboard-metrics'} aria-label={'Ticket summary'}>
            <MetricCard
              label={'Open tickets'}
              value={dashboard.counts.open}
              description={'Active requests still moving through support.'}
              to={dashboard.drillDown.open}
            />
            <MetricCard
              label={'Waiting for you'}
              value={dashboard.counts.waitingForRequester}
              description={'Tickets that need information or confirmation from you.'}
              to={dashboard.drillDown.waitingForRequester}
            />
            <MetricCard
              label={'Resolved in 7 days'}
              value={dashboard.counts.recentlyResolved}
              description={'Work formally resolved or closed during the latest seven-day window.'}
              to={dashboard.drillDown.recentlyResolved}
            />
          </section>

          <div className={'dashboard-sections'}>
            <section className={'dashboard-panel'} aria-labelledby={'attention-heading'}>
              <div className={'dashboard-panel-heading'}>
                <div>
                  <h2 id={'attention-heading'}>Waiting for your attention</h2>
                  <p>Reply or review these tickets to keep work moving.</p>
                </div>
                <Link to={dashboard.drillDown.waitingForRequester}>View all</Link>
              </div>
              <DashboardTicketList
                tickets={dashboard.attentionTickets}
                emptyMessage={'Nothing needs your attention right now.'}
              />
            </section>

            <section className={'dashboard-panel'} aria-labelledby={'recent-heading'}>
              <div className={'dashboard-panel-heading'}>
                <div>
                  <h2 id={'recent-heading'}>Recently updated</h2>
                  <p>Your ten most recently updated tickets.</p>
                </div>
                <Link to={'/tickets'}>View My Tickets</Link>
              </div>
              <DashboardTicketList
                tickets={dashboard.recentTickets}
                emptyMessage={'No tickets yet. Create one when you need IT support.'}
              />
            </section>
          </div>

          {dashboard.recentTickets.length === 0 && (
            <div className={'dashboard-zero-action'}>
              <p>You do not have any tickets yet.</p>
              <Link className={'app-button app-button-primary'} to={'/tickets/new'}>
                <Plus aria-hidden={'true'} /> Create your first ticket
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RequesterDashboardPage
