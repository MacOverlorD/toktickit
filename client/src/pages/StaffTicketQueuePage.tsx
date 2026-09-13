import { Filter, Search } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  DEFAULT_STAFF_QUEUE_QUERY,
  getStaffQueue,
  queueSearch,
  type StaffQueueQuery,
  type StaffQueueResult,
} from '../api/staff-queue'
import type { RequestedPriority, TicketStatus } from '../api/tickets'
import { AppButton, FeedbackState, TicketBadge } from '../components/ui'

const statuses: TicketStatus[] = ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED']
const priorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

function fromSearch(parameters: URLSearchParams): StaffQueueQuery {
  const number = (key: string) => parameters.get(key) ? Number(parameters.get(key)) : null
  const owner = parameters.get('ownerId')
  return {
    ...DEFAULT_STAFF_QUEUE_QUERY,
    search: parameters.get('search') ?? '',
    categoryId: number('categoryId'),
    relatedSystemId: number('relatedSystemId'),
    status: parameters.get('status') as TicketStatus | null,
    requestedPriority: parameters.get('requestedPriority') as RequestedPriority | null,
    itPriority: parameters.get('itPriority') as RequestedPriority | null,
    ownerId: owner === 'unassigned' ? owner : owner ? Number(owner) : null,
    sortBy: (parameters.get('sortBy') as StaffQueueQuery['sortBy']) ?? 'updatedAt',
    sortOrder: parameters.get('sortOrder') === 'asc' ? 'asc' : 'desc',
    page: Number(parameters.get('page') ?? 1),
    pageSize: Number(parameters.get('pageSize') ?? 10) as 10 | 20 | 50,
  }
}

const ownerRequiredStatuses: TicketStatus[] = ['IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'RESOLVED', 'CLOSED']

function Owner({ owner, status }: { owner: { name: string } | null; status: TicketStatus }) {
  return <span><strong>{owner?.name ?? 'Unassigned'}</strong>{!owner && ownerRequiredStatuses.includes(status) && <span className={'staff-assignment-warning'}>Needs assignment</span>}</span>
}

function label(value: string) {
  return value.toLowerCase().split('_').map(part => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export default function StaffTicketQueuePage() {
  const [parameters, setParameters] = useSearchParams()
  const query = fromSearch(parameters)
  const [draft, setDraft] = useState(query)
  const [result, setResult] = useState<StaffQueueResult | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error' | 'forbidden'>('loading')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    let current = true
    setState('loading')
    void getStaffQueue(query).then(data => {
      if (current) { setResult(data); setState('ready') }
    }).catch(error => {
      if (current) setState(error instanceof Error && error.message === 'FORBIDDEN' ? 'forbidden' : 'error')
    })
    return () => { current = false }
  }, [parameters.toString(), retryVersion])

  useEffect(() => {
    setDraft(current => ({ ...current, search: query.search }))
  }, [query.search])

  function apply(event: FormEvent) {
    event.preventDefault()
    setParameters(queueSearch({ ...query, search: draft.search, page: 1 }))
  }
  function change(changes: Partial<StaffQueueQuery>) {
    setDraft(current => ({ ...current, ...changes }))
  }
  function applyControl(changes: Partial<StaffQueueQuery>) {
    setParameters(queueSearch({ ...query, ...changes, page: 1 }))
  }
  function page(next: number) {
    setParameters(queueSearch({ ...query, page: next }))
  }
  const hasFilters = Boolean(query.search || query.categoryId || query.relatedSystemId || query.status || query.requestedPriority || query.itPriority || query.ownerId)
  function clear() {
    setDraft(DEFAULT_STAFF_QUEUE_QUERY)
    setParameters(queueSearch(DEFAULT_STAFF_QUEUE_QUERY))
  }

  return <div className={'page-container staff-queue-page'}>
    <header className={'page-header tickets-page-header'}>
      <div><h1>Ticket Queue</h1><p className={'page-description'}>Review and prioritize service requests.</p></div>
      {result && <strong>{result.pagination.totalItems} tickets</strong>}
    </header>
    <form className={'staff-queue-controls'} onSubmit={apply}>
      <label className={'staff-queue-search'}>Search
        <span><Search aria-hidden={'true'} /><input aria-label={'Search tickets'} value={draft.search} onChange={event => change({ search: event.target.value })} /></span>
      </label>
      <label>Category<select aria-label={'Category'} value={query.categoryId ?? ''} onChange={event => applyControl({ categoryId: event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option>{result?.filterOptions.categories.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' (historical)'}</option>)}</select></label>
      <label>Related System<select aria-label={'Related System'} value={query.relatedSystemId ?? ''} onChange={event => applyControl({ relatedSystemId: event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option>{result?.filterOptions.relatedSystems.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' (historical)'}</option>)}</select></label>
      <label>Status<select aria-label={'Status'} value={query.status ?? ''} onChange={event => applyControl({ status: (event.target.value || null) as TicketStatus | null })}><option value={''}>All</option>{statuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>Requested Priority<select aria-label={'Requested Priority'} value={query.requestedPriority ?? ''} onChange={event => applyControl({ requestedPriority: (event.target.value || null) as RequestedPriority | null })}><option value={''}>All</option>{priorities.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>IT Priority<select aria-label={'IT Priority'} value={query.itPriority ?? ''} onChange={event => applyControl({ itPriority: (event.target.value || null) as RequestedPriority | null })}><option value={''}>All</option>{priorities.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>Owner<select aria-label={'Owner'} value={query.ownerId ?? ''} onChange={event => applyControl({ ownerId: event.target.value === 'unassigned' ? 'unassigned' : event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option><option value={'unassigned'}>Unassigned</option>{result?.filterOptions.owners.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Sort By<select aria-label={'Sort By'} value={query.sortBy} onChange={event => applyControl({ sortBy: event.target.value as StaffQueueQuery['sortBy'] })}><option value={'updatedAt'}>Updated</option><option value={'createdAt'}>Created</option><option value={'ticketNumber'}>Ticket Number</option><option value={'summary'}>Summary</option><option value={'itPriority'}>IT Priority</option></select></label>
      <label>Order<select aria-label={'Sort Order'} value={query.sortOrder} onChange={event => applyControl({ sortOrder: event.target.value as 'asc' | 'desc' })}><option value={'desc'}>Descending</option><option value={'asc'}>Ascending</option></select></label>
      <label>Page Size<select aria-label={'Page Size'} value={query.pageSize} onChange={event => applyControl({ pageSize: Number(event.target.value) as 10 | 20 | 50 })}><option>10</option><option>20</option><option>50</option></select></label>
      <div className={'staff-queue-actions'}><AppButton icon={<Filter />} type={'submit'}>Apply</AppButton><AppButton type={'button'} variant={'secondary'} onClick={clear}>Clear Filters</AppButton></div>
    </form>
    {state === 'loading' && <FeedbackState variant={'loading'} title={'Loading queue'} message={'Retrieving service requests.'} />}
    {state === 'forbidden' && <FeedbackState variant={'error'} title={'Access denied'} message={'Your account cannot view the staff queue.'} />}
    {state === 'error' && <FeedbackState variant={'error'} title={'Queue unavailable'} message={'The queue could not be loaded. Try again.'} action={<AppButton variant={'secondary'} onClick={() => setRetryVersion(value => value + 1)}>Retry</AppButton>} />}
    {state === 'ready' && result?.items.length === 0 && <FeedbackState variant={'no-results'} title={result.pagination.totalItems > 0 ? 'Page out of range' : hasFilters ? 'No matching tickets' : 'No tickets yet'} message={result.pagination.totalItems > 0 ? 'Choose an available page to view these tickets.' : 'No service requests match this view.'} action={result.pagination.totalItems > 0 ? <AppButton variant={'secondary'} onClick={() => page(Math.max(result.pagination.totalPages, 1))}>Go to last page</AppButton> : undefined} />}
    {state === 'ready' && result && result.items.length > 0 && <>
      <div className={'staff-ticket-table-wrapper'}><table className={'staff-ticket-table'} aria-label={'Staff ticket queue'}>
        <thead><tr>{['Ticket Number', 'Summary / Category', 'Created', 'Requested Priority', 'IT Priority', 'Status', 'Owner', 'Open'].map(column => <th key={column} scope={'col'}>{column}</th>)}</tr></thead>
        <tbody>{result.items.map(ticket => <tr key={ticket.ticketNumber}>
          <td><Link to={'/staff/tickets/' + ticket.ticketNumber}>{ticket.ticketNumber}</Link></td>
          <td><strong>{ticket.summary}</strong><br /><span>{ticket.category.name}</span></td>
          <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
          <td><TicketBadge kind={'priority'} value={ticket.requestedPriority} /></td>
          <td><TicketBadge kind={'priority'} value={ticket.itPriority} /></td>
          <td><TicketBadge kind={'status'} value={ticket.status} /></td>
          <td><Owner owner={ticket.owner} status={ticket.status} /></td>
          <td><Link to={'/staff/tickets/' + ticket.ticketNumber}>Open ticket</Link></td>
        </tr>)}</tbody>
      </table></div>
      <div className={'staff-ticket-list'} aria-label={'Staff ticket cards'}>{result.items.map(ticket => <article className={'staff-ticket-card'} key={ticket.ticketNumber}>
        <div className={'staff-ticket-heading'}><Link to={'/staff/tickets/' + ticket.ticketNumber}>{ticket.ticketNumber}</Link><TicketBadge kind={'status'} value={ticket.status} /></div>
        <h2>{ticket.summary}</h2><p>Category: {ticket.category.name} / Created: {new Date(ticket.createdAt).toLocaleDateString()}</p>
        <div className={'staff-ticket-meta'}><span>Requested <TicketBadge kind={'priority'} value={ticket.requestedPriority} /></span><span>IT <TicketBadge kind={'priority'} value={ticket.itPriority} /></span><span>Owner <Owner owner={ticket.owner} status={ticket.status} /></span></div>
        <Link className={'app-button app-button-secondary'} to={'/staff/tickets/' + ticket.ticketNumber}>Open ticket</Link>
      </article>)}</div>
      <nav className={'ticket-pagination'} aria-label={'Queue pages'}><AppButton variant={'secondary'} disabled={!result.pagination.hasPreviousPage} onClick={() => page(query.page - 1)}>Previous</AppButton><span>Page {query.page} of {Math.max(result.pagination.totalPages, 1)}</span><AppButton variant={'secondary'} disabled={!result.pagination.hasNextPage} onClick={() => page(query.page + 1)}>Next</AppButton></nav>
    </>}
  </div>
}
