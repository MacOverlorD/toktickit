import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, type Category } from '../api/categories'
import { getRelatedSystems, type RelatedSystem } from '../api/related-systems'
import {
  getMyTickets,
  type RequestedPriority,
  type TicketListItem,
  type TicketListQuery,
  type TicketListResult,
  type TicketPageSize,
  type TicketSortField,
  type TicketSortOrder,
} from '../api/tickets'
import { AppButton, FeedbackState, TicketBadge } from '../components/ui'
import { useRequester } from '../requesters/RequesterContext'

type LoadState = 'loading' | 'ready' | 'error'

const DEFAULT_QUERY: TicketListQuery = {
  search: '',
  categoryId: null,
  relatedSystemId: null,
  status: null,
  priority: null,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  pageSize: 10,
}

const priorityOptions: Array<{ value: RequestedPriority; label: string }> = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
]
const sortOptions: Array<{ value: TicketSortField; label: string }> = [
  { value: 'createdAt', label: 'Created' },
  { value: 'ticketNumber', label: 'Ticket Number' },
  { value: 'summary', label: 'Summary' },
  { value: 'requestedPriority', label: 'Requested Priority' },
]

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function TicketOpenLink({ ticket }: { ticket: TicketListItem }) {
  return (
    <Link
      className={'ticket-open-link'}
      to={`/tickets/${encodeURIComponent(ticket.ticketNumber)}`}
      aria-label={`Open ticket ${ticket.ticketNumber}`}
    >
      <ExternalLink aria-hidden={'true'} />
      <span>Open</span>
    </Link>
  )
}

function TicketTable({ items }: { items: TicketListItem[] }) {
  return (
    <div className={'ticket-table-wrap'}>
      <table className={'ticket-table'}>
        <thead>
          <tr>
            <th>Ticket Number</th>
            <th>Created</th>
            <th>Summary</th>
            <th>Category</th>
            <th>Related System</th>
            <th>Requested Priority</th>
            <th>Status</th>
            <th>Attachments</th>
            <th><span className={'visually-hidden'}>Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((ticket) => (
            <tr key={ticket.ticketNumber}>
              <td>
                <Link className={'ticket-number-link'} to={`/tickets/${ticket.ticketNumber}`}>
                  {ticket.ticketNumber}
                </Link>
              </td>
              <td className={'ticket-date'}>{formatCreatedAt(ticket.createdAt)}</td>
              <td className={'ticket-summary-cell'} title={ticket.summary}>
                <span>{ticket.summary}</span>
              </td>
              <td>{ticket.category.name}</td>
              <td>{ticket.relatedSystem.name}</td>
              <td><TicketBadge kind={'priority'} value={ticket.requestedPriority} /></td>
              <td><TicketBadge kind={'status'} value={ticket.status} /></td>
              <td className={'ticket-count'}>{ticket.attachmentCount}</td>
              <td><TicketOpenLink ticket={ticket} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TicketCards({ items }: { items: TicketListItem[] }) {
  return (
    <ul className={'ticket-card-list'}>
      {items.map((ticket) => (
        <li className={'ticket-card'} key={ticket.ticketNumber}>
          <div className={'ticket-card-heading'}>
            <Link className={'ticket-number-link'} to={`/tickets/${ticket.ticketNumber}`}>
              {ticket.ticketNumber}
            </Link>
            <TicketBadge kind={'status'} value={ticket.status} />
          </div>
          <p className={'ticket-card-summary'}>{ticket.summary}</p>
          <dl className={'ticket-card-metadata'}>
            <div><dt>Created</dt><dd>{formatCreatedAt(ticket.createdAt)}</dd></div>
            <div><dt>Category</dt><dd>{ticket.category.name}</dd></div>
            <div><dt>Related System</dt><dd>{ticket.relatedSystem.name}</dd></div>
            <div><dt>Attachments</dt><dd>{ticket.attachmentCount}</dd></div>
          </dl>
          <div className={'ticket-card-footer'}>
            <TicketBadge kind={'priority'} value={ticket.requestedPriority} />
            <TicketOpenLink ticket={ticket} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function MyTicketsPage() {
  const { selectedRequester } = useRequester()
  const [query, setQuery] = useState<TicketListQuery>(DEFAULT_QUERY)
  const [searchDraft, setSearchDraft] = useState('')
  const [result, setResult] = useState<TicketListResult | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [categories, setCategories] = useState<Category[]>([])
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([])
  const [referencesReady, setReferencesReady] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const loadReferences = useCallback(async () => {
    setReferencesReady(false)
    try {
      const [categoryItems, systemItems] = await Promise.all([
        getCategories(),
        getRelatedSystems(),
      ])
      setCategories(categoryItems)
      setRelatedSystems(systemItems)
    } catch {
      setCategories([])
      setRelatedSystems([])
    } finally {
      setReferencesReady(true)
    }
  }, [])

  useEffect(() => {
    void loadReferences()
  }, [loadReferences])

  const loadTickets = useCallback(async () => {
    if (!selectedRequester) return
    setLoadState('loading')
    try {
      const nextResult = await getMyTickets(query, selectedRequester.id)
      setResult(nextResult)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [query, selectedRequester])

  useEffect(() => {
    let active = true
    if (!selectedRequester) return () => undefined
    setLoadState('loading')
    void getMyTickets(query, selectedRequester.id)
      .then((nextResult) => {
        if (!active) return
        setResult(nextResult)
        setLoadState('ready')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [query, selectedRequester])

  const activeFilterCount = useMemo(
    () =>
      [query.search, query.categoryId, query.relatedSystemId, query.status, query.priority]
        .filter((value) => value !== '' && value !== null).length,
    [query],
  )

  function updateQuery(changes: Partial<TicketListQuery>) {
    setQuery((current) => ({ ...current, ...changes, page: 1 }))
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    updateQuery({ search: searchDraft.trim() })
  }

  function clearSearch() {
    setSearchDraft('')
    updateQuery({ search: '' })
  }

  function clearFilters() {
    setSearchDraft('')
    setQuery(DEFAULT_QUERY)
  }

  const hasTickets = result !== null && result.items.length > 0
  const isFiltered = activeFilterCount > 0

  return (
    <div className={'page-container my-tickets-page'}>
      <header className={'page-header tickets-page-header'}>
        <div>
          <h1>My Tickets</h1>
          <p className={'page-description'}>
            Tickets submitted by {selectedRequester?.name}.
          </p>
        </div>
        <Link
          className={'app-button app-button-primary'}
          to={'/tickets/new'}
          aria-label={'Create a new ticket'}
        >
          <Plus aria-hidden={'true'} />
          <span>Create Ticket</span>
        </Link>
      </header>

      <section className={'ticket-controls'} aria-label={'Ticket list controls'}>
        <form className={'ticket-search'} role={'search'} onSubmit={submitSearch}>
          <label className={'field-label'} htmlFor={'ticket-search'}>Search tickets</label>
          <div className={'ticket-search-row'}>
            <div className={'search-input-wrap'}>
              <Search aria-hidden={'true'} />
              <input
                className={'text-field'}
                id={'ticket-search'}
                type={'search'}
                maxLength={100}
                value={searchDraft}
                placeholder={'Ticket number, summary, or description'}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </div>
            <AppButton type={'submit'} icon={<Search />}>Search</AppButton>
            {query.search && (
              <AppButton type={'button'} variant={'tertiary'} icon={<X />} onClick={clearSearch}>
                Clear Search
              </AppButton>
            )}
          </div>
        </form>

        <button
          className={'filter-toggle'}
          type={'button'}
          aria-expanded={filtersOpen}
          aria-controls={'ticket-filter-panel'}
          onClick={() => setFiltersOpen((open) => !open)}
        >
          <Filter aria-hidden={'true'} />
          <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ''}</span>
        </button>

        <div
          className={`ticket-filter-grid${filtersOpen ? ' is-open' : ''}`}
          id={'ticket-filter-panel'}
        >
          <label className={'compact-field'}>
            <span>Category</span>
            <select
              className={'select-field'}
              value={query.categoryId ?? ''}
              disabled={!referencesReady}
              onChange={(event) => updateQuery({
                categoryId: event.target.value ? Number(event.target.value) : null,
              })}
            >
              <option value={''}>All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Related System</span>
            <select
              className={'select-field'}
              value={query.relatedSystemId ?? ''}
              disabled={!referencesReady}
              onChange={(event) => updateQuery({
                relatedSystemId: event.target.value ? Number(event.target.value) : null,
              })}
            >
              <option value={''}>All systems</option>
              {relatedSystems.map((system) => (
                <option key={system.id} value={system.id}>{system.name}</option>
              ))}
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Status</span>
            <select
              className={'select-field'}
              value={query.status ?? ''}
              onChange={(event) => updateQuery({ status: event.target.value ? 'NEW' : null })}
            >
              <option value={''}>All statuses</option>
              <option value={'NEW'}>New</option>
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Requested Priority</span>
            <select
              className={'select-field'}
              value={query.priority ?? ''}
              onChange={(event) => updateQuery({
                priority: (event.target.value || null) as RequestedPriority | null,
              })}
            >
              <option value={''}>All priorities</option>
              {priorityOptions.map((priority) => (
                <option key={priority.value} value={priority.value}>{priority.label}</option>
              ))}
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Sort by</span>
            <select
              className={'select-field'}
              value={query.sortBy}
              onChange={(event) => updateQuery({ sortBy: event.target.value as TicketSortField })}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Sort direction</span>
            <select
              className={'select-field'}
              value={query.sortOrder}
              onChange={(event) => updateQuery({ sortOrder: event.target.value as TicketSortOrder })}
            >
              <option value={'desc'}>Descending</option>
              <option value={'asc'}>Ascending</option>
            </select>
          </label>
          <label className={'compact-field'}>
            <span>Tickets per page</span>
            <select
              className={'select-field'}
              value={query.pageSize}
              onChange={(event) => updateQuery({ pageSize: Number(event.target.value) as TicketPageSize })}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          {isFiltered && (
            <AppButton type={'button'} variant={'secondary'} onClick={clearFilters}>
              Clear Filters
            </AppButton>
          )}
        </div>
      </section>

      <section className={'ticket-results'} aria-label={'My ticket results'}>
        {loadState === 'loading' && (
          <FeedbackState
            variant={'loading'}
            title={'Loading tickets'}
            message={'Retrieving requester-owned tickets.'}
          />
        )}
        {loadState === 'error' && (
          <FeedbackState
            variant={'error'}
            title={'Tickets unavailable'}
            message={'The ticket list could not be loaded. Try again.'}
            action={<AppButton variant={'secondary'} onClick={() => void loadTickets()}>Retry</AppButton>}
          />
        )}
        {loadState === 'ready' && result && result.items.length === 0 && !isFiltered && (
          <FeedbackState
            variant={'empty'}
            title={'No tickets yet'}
            message={'This requester has not submitted any tickets.'}
            action={
              <Link
                className={'app-button app-button-primary'}
                to={'/tickets/new'}
                aria-label={'Create your first ticket'}
              >
                <Plus aria-hidden={'true'} />
                <span>Create Ticket</span>
              </Link>
            }
          />
        )}
        {loadState === 'ready' && result && result.items.length === 0 && isFiltered && (
          <FeedbackState
            variant={'no-results'}
            title={'No matching tickets'}
            message={'No tickets match the current search and filters.'}
            action={<AppButton variant={'secondary'} onClick={clearFilters}>Clear Filters</AppButton>}
          />
        )}
        {loadState === 'ready' && result && hasTickets && (
          <>
            <div className={'ticket-result-summary'} aria-live={'polite'}>
              <span>{result.pagination.totalItems} tickets</span>
              <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
            </div>
            <TicketTable items={result.items} />
            <TicketCards items={result.items} />
            <nav className={'ticket-pagination'} aria-label={'Ticket list pages'}>
              <AppButton
                type={'button'}
                variant={'secondary'}
                icon={<ChevronLeft />}
                disabled={!result.pagination.hasPreviousPage}
                onClick={() => setQuery((current) => ({ ...current, page: current.page - 1 }))}
              >
                Previous
              </AppButton>
              <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
              <AppButton
                type={'button'}
                variant={'secondary'}
                icon={<ChevronRight />}
                disabled={!result.pagination.hasNextPage}
                onClick={() => setQuery((current) => ({ ...current, page: current.page + 1 }))}
              >
                Next
              </AppButton>
            </nav>
          </>
        )}
      </section>
    </div>
  )
}

export default MyTicketsPage
