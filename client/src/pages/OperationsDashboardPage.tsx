import { ArrowRight, Clock3, RefreshCw } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  getOperationsDashboard,
  type OperationsDashboardResult,
  type OperationsTicket,
} from '../api/operations-dashboard'
import type { RequestedPriority, TicketStatus } from '../api/tickets'
import { useAuth } from '../auth/AuthContext'
import { AppButton, FeedbackState, TicketBadge } from '../components/ui'

const statuses: TicketStatus[] = [
  'NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER',
  'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED',
]
const priorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function label(value: string) {
  return value.toLowerCase().split('_').map((part) =>
    part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Bangkok',
  }).format(new Date(value))
}

function Metric({ label: metricLabel, value, description, action }: {
  label: string
  value: number
  description: string
  action?: ReactNode
}) {
  return <article className={'dashboard-metric-card'}>
    <p className={'dashboard-metric-label'}>{metricLabel}</p>
    <p className={'dashboard-metric-value'} aria-label={`${metricLabel}: ${value}`}>{value}</p>
    <p>{description}</p>
    {action}
  </article>
}

function TicketList({ tickets, empty }: { tickets: OperationsTicket[]; empty: string }) {
  if (tickets.length === 0) return <p className={'dashboard-list-empty'}>{empty}</p>
  return <ul className={'dashboard-ticket-list'}>{tickets.map((ticket) =>
    <li key={ticket.ticketNumber}>
      <div className={'dashboard-ticket-heading'}>
        <Link to={`/staff/tickets/${encodeURIComponent(ticket.ticketNumber)}`}>
          {ticket.ticketNumber}
        </Link>
        <TicketBadge kind={'status'} value={ticket.status} />
      </div>
      <p>{ticket.summary}</p>
      <div className={'dashboard-ticket-meta'}>
        <TicketBadge kind={'priority'} value={ticket.itPriority} />
        <span>Owner: {ticket.owner?.name ?? 'Unassigned'}</span>
        <span><Clock3 aria-hidden={'true'} /> Updated {formatTime(ticket.updatedAt)}</span>
      </div>
    </li>)}</ul>
}

export default function OperationsDashboardPage() {
  const { state: authState } = useAuth()
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [data, setData] = useState<OperationsDashboardResult | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    setState('loading')
    void getOperationsDashboard().then((next) => {
      if (active) { setData(next); setState('ready') }
    }).catch(() => {
      if (active) setState('error')
    })
    return () => { active = false }
  }, [retry])

  const user = authState.status === 'authenticated' ? authState.payload.user : null

  return <div className={'page-container requester-dashboard-page operations-dashboard-page'}>
    <header className={'page-header'}>
      <div><h1>Operational Dashboard</h1><p className={'page-description'}>
        Current service-desk workload for {user?.name ?? 'the signed-in operator'}.
      </p></div>
      <Link className={'app-button app-button-secondary'} to={'/staff/tickets'}>
        Open Ticket Queue
      </Link>
    </header>

    {state === 'loading' && <FeedbackState variant={'loading'} title={'Loading operational dashboard'} message={'Calculating the latest service-desk workload.'} />}
    {state === 'error' && <FeedbackState variant={'error'} title={'Operational dashboard unavailable'} message={'Dashboard data could not be loaded. Ticket data remains safe.'} action={<AppButton variant={'secondary'} icon={<RefreshCw />} onClick={() => setRetry((value) => value + 1)}>Retry</AppButton>} />}
    {state === 'ready' && data && <>
      <section className={'dashboard-metrics operations-metrics'} aria-label={'Operational summary'}>
        <Metric label={'Unassigned tickets'} value={data.counts.unassigned} description={'Active tickets without a primary owner.'} action={<Link className={'dashboard-card-link'} to={'/staff/tickets?ownerId=unassigned'}>View queue <ArrowRight aria-hidden={'true'} /></Link>} />
        <Metric label={'Owned by me'} value={data.counts.ownedByMe} description={'Active tickets where you are the primary owner.'} action={<Link className={'dashboard-card-link'} to={'/staff/tickets?ownerId=me'}>View my tickets <ArrowRight aria-hidden={'true'} /></Link>} />
        <Metric label={'Actions assigned to me'} value={data.counts.myAssignedActions} description={'Current-cycle planned or in-progress Actions.'} action={<a className={'dashboard-card-link'} href={'#my-actions'}>View assigned Actions <ArrowRight aria-hidden={'true'} /></a>} />
        <Metric label={'Completed by me in 7 days'} value={data.counts.myPerformedLast7Days} description={'Actions you personally completed in the inclusive seven-day window.'} />
      </section>

      <div className={'dashboard-sections'}>
        <section className={'dashboard-panel'} aria-labelledby={'status-summary-heading'}>
          <div className={'dashboard-panel-heading'}><div><h2 id={'status-summary-heading'}>Tickets by status</h2><p>All service-desk tickets.</p></div></div>
          <div className={'operations-breakdown'}>{statuses.map((status) =>
            <Link key={status} to={`/staff/tickets?status=${status}`}>
              <span>{label(status)}</span><strong>{data.byStatus[status]}</strong>
            </Link>)}</div>
        </section>
        <section className={'dashboard-panel'} aria-labelledby={'priority-summary-heading'}>
          <div className={'dashboard-panel-heading'}><div><h2 id={'priority-summary-heading'}>Active tickets by IT priority</h2><p>Current operational priority distribution.</p></div></div>
          <div className={'operations-breakdown'}>{priorities.map((priority) =>
            <Link key={priority} to={`/staff/tickets?itPriority=${priority}`}>
              <span>{label(priority)}</span><strong>{data.byPriority[priority]}</strong>
            </Link>)}</div>
        </section>
      </div>

      <section className={'dashboard-panel'} id={'my-actions'} aria-labelledby={'my-actions-heading'} tabIndex={-1}>
        <div className={'dashboard-panel-heading'}><div><h2 id={'my-actions-heading'}>Actions assigned to me</h2><p>Current-cycle work that is planned or in progress.</p></div></div>
        {data.myActions.length === 0 ? <p className={'dashboard-list-empty'}>No active Actions are assigned to you.</p> :
          <ul className={'dashboard-action-list'}>{data.myActions.map((action) =>
            <li key={action.id}>
              <div><Link to={`/staff/tickets/${encodeURIComponent(action.ticketNumber)}#action-${action.id}`}>Action #{action.id} on {action.ticketNumber}</Link><span className={`action-status action-status-${action.status.toLowerCase()}`}>{label(action.status)}</span></div>
              <p>{action.description}</p><small>Updated {formatTime(action.updatedAt)}</small>
            </li>)}</ul>}
      </section>

      <div className={'dashboard-sections'}>
        <section className={'dashboard-panel'} aria-labelledby={'urgent-heading'}>
          <div className={'dashboard-panel-heading'}><div><h2 id={'urgent-heading'}>Urgent active tickets</h2><p>Highest-priority work needing operational awareness.</p></div><Link to={'/staff/tickets?itPriority=URGENT'}>View all</Link></div>
          <TicketList tickets={data.urgentTickets} empty={'No active urgent tickets.'} />
        </section>
        <section className={'dashboard-panel'} aria-labelledby={'operations-recent-heading'}>
          <div className={'dashboard-panel-heading'}><div><h2 id={'operations-recent-heading'}>Recently updated tickets</h2><p>The ten latest updates across the service desk.</p></div><Link to={'/staff/tickets'}>View queue</Link></div>
          <TicketList tickets={data.recentTickets} empty={'No tickets are available.'} />
        </section>
      </div>

      {data.administration && <section className={'dashboard-panel'} aria-labelledby={'administration-heading'}>
        <div className={'dashboard-panel-heading'}><div><h2 id={'administration-heading'}>Account summary</h2><p>Concise Administrator-only account counts.</p></div><Link to={'/admin/users'}>Manage users</Link></div>
        <dl className={'administration-summary'}>
          <div><dt>Active Requesters</dt><dd>{data.administration.activeRequesters}</dd></div>
          <div><dt>Active IT Staff</dt><dd>{data.administration.activeStaff}</dd></div>
          <div><dt>Active Administrators</dt><dd>{data.administration.activeAdministrators}</dd></div>
          <div><dt>Inactive Accounts</dt><dd>{data.administration.inactiveAccounts}</dd></div>
        </dl>
      </section>}
    </>}
  </div>
}
