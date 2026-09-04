import { ArrowLeft, FileText, LockKeyhole, Paperclip } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getTicketDetail,
  type TicketAttachmentMetadata,
  type TicketDetail,
} from '../api/ticket-detail'
import { TicketApiError } from '../api/tickets'
import { AppButton, FeedbackState, TicketBadge } from '../components/ui'
import { useRequester } from '../requesters/RequesterContext'
import { formatFileSize } from '../tickets/attachment-selection'

type LoadState = 'loading' | 'ready' | 'not-found' | 'error'

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={'detail-field'}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function AttachmentRow({ attachment }: { attachment: TicketAttachmentMetadata }) {
  const removed = attachment.isRemoved

  return (
    <li className={'detail-attachment-row'}>
      <FileText aria-hidden={'true'} />
      <div className={'detail-attachment-copy'}>
        <strong>{attachment.originalName}</strong>
        <span>{attachment.mimeType} - {formatFileSize(attachment.sizeBytes)}</span>
        <span>Uploaded {formatDate(attachment.createdAt)}</span>
        {removed && (
          <span>
            Removed {formatDate(attachment.removedAt!)} - {attachment.removalReason}
          </span>
        )}
      </div>
      <span className={`attachment-state ${removed ? 'is-removed' : 'is-active'}`}>
        {removed ? 'Removed' : 'Active'}
      </span>
    </li>
  )
}

function TicketDetailContent({ ticket }: { ticket: TicketDetail }) {
  return (
    <>
      <header className={'ticket-detail-header'}>
        <div>
          <Link className={'detail-back-link'} to={'/tickets'}>
            <ArrowLeft aria-hidden={'true'} />
            <span>Back to My Tickets</span>
          </Link>
          <h1>{ticket.ticketNumber}</h1>
          <p className={'page-description'}>Created {formatDate(ticket.ticketDate)}</p>
        </div>
        <div className={'ticket-detail-badges'}>
          <TicketBadge kind={'status'} value={ticket.status} />
          <TicketBadge kind={'priority'} value={ticket.requestedPriority} />
        </div>
      </header>

      <div className={'ticket-detail-surface'}>
        <section className={'detail-section'} aria-labelledby={'request-heading'}>
          <div className={'detail-section-heading'}>
            <h2 id={'request-heading'}>Request</h2>
            <span><LockKeyhole aria-hidden={'true'} /> Read-only</span>
          </div>
          <dl className={'detail-grid detail-request-grid'}>
            <DetailField label={'Ticket Number'}>{ticket.ticketNumber}</DetailField>
            <DetailField label={'Ticket Date'}>{formatDate(ticket.ticketDate)}</DetailField>
            <DetailField label={'Summary'}>{ticket.summary}</DetailField>
            <DetailField label={'Description'}>
              <span className={'detail-description'}>{ticket.description}</span>
            </DetailField>
          </dl>
        </section>

        <section className={'detail-section'} aria-labelledby={'classification-heading'}>
          <div className={'detail-section-heading'}>
            <h2 id={'classification-heading'}>Classification</h2>
          </div>
          <dl className={'detail-grid'}>
            <DetailField label={'Category'}>{ticket.category.name}</DetailField>
            <DetailField label={'Related System'}>{ticket.relatedSystem.name}</DetailField>
            <DetailField label={'Requested Priority'}>
              <TicketBadge kind={'priority'} value={ticket.requestedPriority} />
            </DetailField>
            <DetailField label={'Current Status'}>
              <TicketBadge kind={'status'} value={ticket.status} />
            </DetailField>
          </dl>
        </section>

        <section className={'detail-section'} aria-labelledby={'requester-heading'}>
          <div className={'detail-section-heading'}>
            <h2 id={'requester-heading'}>Requester</h2>
          </div>
          <dl className={'detail-grid'}>
            <DetailField label={'Name'}>{ticket.requester.name}</DetailField>
            <DetailField label={'Email'}>{ticket.requester.email}</DetailField>
          </dl>
        </section>

        <section className={'detail-section'} aria-labelledby={'attachments-heading'}>
          <div className={'detail-section-heading'}>
            <h2 id={'attachments-heading'}>
              <Paperclip aria-hidden={'true'} /> Attachments
            </h2>
            <span>{ticket.attachments.length} total</span>
          </div>
          {ticket.attachments.length === 0 ? (
            <p className={'detail-empty-attachments'}>No attachments</p>
          ) : (
            <ul className={'detail-attachment-list'}>
              {ticket.attachments.map((attachment) => (
                <AttachmentRow key={attachment.id} attachment={attachment} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

function RequesterTicketDetailPage() {
  const { ticketNumber = '' } = useParams()
  const { selectedRequester } = useRequester()
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [retryVersion, setRetryVersion] = useState(0)

  useEffect(() => {
    let active = true
    if (!selectedRequester) return () => undefined

    setTicket(null)
    setLoadState('loading')
    void getTicketDetail(ticketNumber, selectedRequester.id)
      .then((nextTicket) => {
        if (!active) return
        setTicket(nextTicket)
        setLoadState('ready')
      })
      .catch((error: unknown) => {
        if (!active) return
        const notFound = error instanceof TicketApiError &&
          (error.code === 'RESOURCE_NOT_FOUND' || error.code === 'INVALID_TICKET_NUMBER')
        setLoadState(notFound ? 'not-found' : 'error')
      })

    return () => {
      active = false
    }
  }, [retryVersion, selectedRequester, ticketNumber])

  return (
    <div className={'page-container ticket-detail-page'}>
      {loadState === 'loading' && (
        <FeedbackState
          variant={'loading'}
          title={'Loading ticket'}
          message={'Retrieving requester-owned ticket details.'}
        />
      )}
      {loadState === 'not-found' && (
        <FeedbackState
          variant={'no-results'}
          title={'Ticket not found'}
          message={'This ticket is not available for the selected requester.'}
          action={
            <Link className={'app-button app-button-secondary'} to={'/tickets'}>
              Back to My Tickets
            </Link>
          }
        />
      )}
      {loadState === 'error' && (
        <FeedbackState
          variant={'error'}
          title={'Ticket unavailable'}
          message={'The ticket details could not be loaded. Try again.'}
          action={
            <AppButton variant={'secondary'} onClick={() => setRetryVersion((value) => value + 1)}>
              Retry
            </AppButton>
          }
        />
      )}
      {loadState === 'ready' && ticket && <TicketDetailContent ticket={ticket} />}
    </div>
  )
}

export default RequesterTicketDetailPage
