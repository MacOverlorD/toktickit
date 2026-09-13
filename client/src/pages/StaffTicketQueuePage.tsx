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

  function apply(event: FormEvent) {
    event.preventDefault()
    setParameters(queueSearch({ ...draft, page: 1 }))
  }
  function change(changes: Partial<StaffQueueQuery>) {
    setDraft(current => ({ ...current, ...changes }))
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
      <label>Category<select aria-label={'Category'} value={draft.categoryId ?? ''} onChange={event => change({ categoryId: event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option>{result?.filterOptions.categories.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' (historical)'}</option>)}</select></label>
      <label>Related System<select aria-label={'Related System'} value={draft.relatedSystemId ?? ''} onChange={event => change({ relatedSystemId: event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option>{result?.filterOptions.relatedSystems.map(item => <option key={item.id} value={item.id}>{item.name}{item.isActive ? '' : ' (historical)'}</option>)}</select></label>
      <label>Status<select aria-label={'Status'} value={draft.status ?? ''} onChange={event => change({ status: (event.target.value || null) as TicketStatus | null })}><option value={''}>All</option>{statuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>Requested Priority<select aria-label={'Requested Priority'} value={draft.requestedPriority ?? ''} onChange={event => change({ requestedPriority: (event.target.value || null) as RequestedPriority | null })}><option value={''}>All</option>{priorities.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>IT Priority<select aria-label={'IT Priority'} value={draft.itPriority ?? ''} onChange={event => change({ itPriority: (event.target.value || null) as RequestedPriority | null })}><option value={''}>All</option>{priorities.map(item => <option key={item} value={item}>{label(item)}</option>)}</select></label>
      <label>Owner<select aria-label={'Owner'} value={draft.ownerId ?? ''} onChange={event => change({ ownerId: event.target.value === 'unassigned' ? 'unassigned' : event.target.value ? Number(event.target.value) : null })}><option value={''}>All</option><option value={'unassigned'}>Unassigned</option>{result?.filterOptions.owners.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Sort By<select aria-label={'Sort By'} value={draft.sortBy} onChange={event => change({ sortBy: event.target.value as StaffQueueQuery['sortBy'] })}><option value={'updatedAt'}>Updated</option><option value={'createdAt'}>Created</option><option value={'ticketNumber'}>Ticket Number</option><option value={'summary'}>Summary</option><option value={'itPriority'}>IT Priority</option></select></label>
      <label>Order<select aria-label={'Sort Order'} value={draft.sortOrder} onChange={event => change({ sortOrder: event.target.value as 'asc' | 'desc' })}><option value={'desc'}>Descending</option><option value={'asc'}>Ascending</option></select></label>
      <label>Page Size<select aria-label={'Page Size'} value={draft.pageSize} onChange={event => change({ pageSize: Number(event.target.value) as 10 | 20 | 50 })}><option>10</option><option>20</option><option>50</option></select></label>
      <div className={'staff-queue-actions'}><AppButton icon={<Filter />} type={'submit'}>Apply</AppButton><AppButton type={'button'} variant={'secondary'} onClick={clear}>Clear Filters</AppButton></div>
    </form>
    {state === 'loading' && <FeedbackState variant={'loading'} title={'Loading queue'} message={'Retrieving service requests.'} />}
    {state === 'forbidden' && <FeedbackState variant={'error'} title={'Access denied'} message={'Your account cannot view the staff queue.'} />}
    {state === 'error' && <FeedbackState variant={'error'} title={'Queue unavailable'} message={'The queue could not be loaded. Try again.'} action={<AppButton variant={'secondary'} onClick={() => setRetryVersion(value => value + 1)}>Retry</AppButton>} />}
    {state === 'ready' && result?.items.length === 0 && <FeedbackState variant={'no-results'} title={hasFilters ? 'No matching tickets' : 'No tickets yet'} message={'No service requests match this view.'} />}
    {state === 'ready' && result && result.items.length > 0 && <>
      <div className={'staff-ticket-list'}>{result.items.map(ticket => <article className={'staff-ticket-card'} key={ticket.ticketNumber}>
        <div className={'staff-ticket-heading'}><Link to={'/staff/tickets/' + ticket.ticketNumber}>{ticket.ticketNumber}</Link><TicketBadge kind={'status'} value={ticket.status} /></div>
        <h2>{ticket.summary}</h2><p>{ticket.category.name} · {new Date(ticket.createdAt).toLocaleDateString()}</p>
        <div className={'staff-ticket-meta'}><span>Requested <TicketBadge kind={'priority'} value={ticket.requestedPriority} /></span><span>IT <TicketBadge kind={'priority'} value={ticket.itPriority} /></span><span>Owner <strong>{ticket.owner?.name ?? 'Unassigned'}</strong></span></div>
        <Link className={'app-button app-button-secondary'} to={'/staff/tickets/' + ticket.ticketNumber}>Open ticket</Link>
      </article>)}</div>
      <nav className={'ticket-pagination'} aria-label={'Queue pages'}><AppButton variant={'secondary'} disabled={!result.pagination.hasPreviousPage} onClick={() => page(query.page - 1)}>Previous</AppButton><span>Page {query.page} of {Math.max(result.pagination.totalPages, 1)}</span><AppButton variant={'secondary'} disabled={!result.pagination.hasNextPage} onClick={() => page(query.page + 1)}>Next</AppButton></nav>
    </>}
  </div>
}
