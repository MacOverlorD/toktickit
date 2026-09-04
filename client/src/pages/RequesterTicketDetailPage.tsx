import { ArrowLeft, Download, Eye, FileText, LockKeyhole, Paperclip, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  getTicketDetail,
  type TicketAttachmentMetadata,
  type TicketDetail,
} from '../api/ticket-detail'
import { TicketApiError } from '../api/tickets'
import {
  getAttachmentContent,
  removeAttachment,
  uploadAttachment,
} from '../api/attachments'
import { AppButton, FeedbackState, IconButton, TicketBadge } from '../components/ui'
import { useRequester } from '../requesters/RequesterContext'
import {
  formatFileSize,
  MAX_ATTACHMENT_COUNT,
  validateAttachment,
} from '../tickets/attachment-selection'

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

function AttachmentRow({
  attachment,
  onContent,
  onRemove,
  busy,
}: {
  attachment: TicketAttachmentMetadata
  onContent: (attachment: TicketAttachmentMetadata, disposition: 'inline' | 'attachment') => void
  onRemove: (attachment: TicketAttachmentMetadata, trigger: HTMLButtonElement) => void
  busy: boolean
}) {
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
      {!removed && (
        <div className={'attachment-actions'}>
          <IconButton
            label={'Preview ' + attachment.originalName}
            icon={<Eye />}
            disabled={busy}
            onClick={() => onContent(attachment, 'inline')}
          />
          <IconButton
            label={'Download ' + attachment.originalName}
            icon={<Download />}
            disabled={busy}
            onClick={() => onContent(attachment, 'attachment')}
          />
          <IconButton
            label={'Remove ' + attachment.originalName}
            icon={<Trash2 />}
            destructive
            disabled={busy}
            onClick={(event) => onRemove(attachment, event.currentTarget)}
          />
        </div>
      )}
    </li>
  )
}

function TicketDetailContent({
  ticket,
  requesterId,
  onTicketChange,
}: {
  ticket: TicketDetail
  requesterId: number
  onTicketChange: (ticket: TicketDetail) => void
}) {
  const [actionError, setActionError] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failedUploads, setFailedUploads] = useState<File[]>([])
  const [removing, setRemoving] = useState<TicketAttachmentMetadata | null>(null)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const removeButton = useRef<HTMLButtonElement | null>(null)
  const dialog = useRef<HTMLElement | null>(null)
  const activeCount = ticket.attachments.filter((item) => !item.isRemoved).length

  function closeRemoval() {
    setRemoving(null)
    setReason('')
    setReasonError('')
    window.setTimeout(() => removeButton.current?.focus(), 0)
  }

  useEffect(() => {
    if (!removing) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) closeRemoval()
      if (event.key !== 'Tab') return
      const controls = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'textarea, button:not([disabled])',
        ) ?? [],
      )
      if (controls.length === 0) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [busy, removing])

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setActionError('')
    setActionMessage('')
    if (files.length === 0) return
    if (activeCount + files.length > MAX_ATTACHMENT_COUNT) {
      setActionError('A ticket can have no more than five active attachments.')
      return
    }
    const invalid = files.find((file) => validateAttachment(file))
    if (invalid) {
      setActionError(validateAttachment(invalid)!)
      return
    }
    setActionMessage(files.length === 1 ? 'Uploading attachment...' : 'Uploading attachments...')
    setBusy(true)
    const uploaded: TicketAttachmentMetadata[] = []
    const failed: File[] = []
    for (const file of files) {
      try {
        uploaded.push(await uploadAttachment(ticket.ticketNumber, requesterId, file))
      } catch {
        failed.push(file)
      }
    }
    if (uploaded.length > 0) {
      onTicketChange({ ...ticket, attachments: [...ticket.attachments, ...uploaded] })
    }
    setFailedUploads(failed)
    if (failed.length === 0) {
      setActionMessage(uploaded.length === 1 ? 'Attachment uploaded.' : 'Attachments uploaded.')
    } else {
      setActionError('Some attachments could not be uploaded. The ticket remains available.')
    }
    setBusy(false)
  }

  async function retryUploads() {
    const files = failedUploads
    setFailedUploads([])
    const input = { target: { files, value: '' } } as unknown as ChangeEvent<HTMLInputElement>
    await handleUpload(input)
  }

  async function handleContent(
    attachment: TicketAttachmentMetadata,
    disposition: 'inline' | 'attachment',
  ) {
    setBusy(true)
    setActionError('')
    try {
      const blob = await getAttachmentContent(
        ticket.ticketNumber,
        attachment.id,
        requesterId,
        disposition,
      )
      const url = URL.createObjectURL(blob)
      if (disposition === 'inline') {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        const link = document.createElement('a')
        link.href = url
        link.download = attachment.originalName
        link.click()
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch {
      setActionError('Attachment content is unavailable. Refresh and try again.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmRemoval() {
    if (!removing) return
    const normalized = reason.trim()
    if (normalized.length < 5 || normalized.length > 250) {
      setReasonError('Removal reason must contain 5 to 250 characters.')
      return
    }
    setBusy(true)
    setReasonError('')
    try {
      const updated = await removeAttachment(
        ticket.ticketNumber,
        removing.id,
        requesterId,
        normalized,
      )
      onTicketChange({
        ...ticket,
        attachments: ticket.attachments.map((item) =>
          item.id === updated.id ? updated : item),
      })
      closeRemoval()
      setActionMessage('Attachment removed.')
    } catch {
      setReasonError('The attachment could not be removed. Try again.')
    } finally {
      setBusy(false)
    }
  }
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
          <div className={'attachment-toolbar'}>
            <label className={'app-button app-button-secondary'} htmlFor={'detail-attachment-upload'}>
              <Upload aria-hidden={'true'} />
              <span>{busy ? 'Working...' : 'Add attachments'}</span>
            </label>
            <input
              className={'visually-hidden'}
              id={'detail-attachment-upload'}
              type={'file'}
              multiple
              accept={'.jpg,.jpeg,.png,.webp,.pdf'}
              disabled={busy || activeCount >= MAX_ATTACHMENT_COUNT}
              onChange={(event) => void handleUpload(event)}
            />
            <span>
              {activeCount} of {MAX_ATTACHMENT_COUNT} active
              {activeCount >= MAX_ATTACHMENT_COUNT && ' - limit reached'}
            </span>
          </div>
          {actionError && <p className={'attachment-action-error'} role={'alert'}>{actionError}</p>}
          {actionMessage && <p className={'attachment-action-success'} role={'status'}>{actionMessage}</p>}
          {failedUploads.length > 0 && (
            <AppButton variant={'secondary'} disabled={busy} onClick={() => void retryUploads()}>
              Retry failed uploads
            </AppButton>
          )}
          {ticket.attachments.length === 0 ? (
            <p className={'detail-empty-attachments'}>No attachments</p>
          ) : (
            <ul className={'detail-attachment-list'}>
              {ticket.attachments.map((attachment) => (
                <AttachmentRow
                  key={attachment.id}
                  attachment={attachment}
                  busy={busy}
                  onContent={(item, disposition) => void handleContent(item, disposition)}
                  onRemove={(item, trigger) => {
                    removeButton.current = trigger
                    setRemoving(item)
                    setReason('')
                    setReasonError('')
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
      {removing && (
        <div className={'modal-backdrop'}>
          <section
            ref={dialog}
            className={'removal-dialog'}
            role={'dialog'}
            aria-modal={'true'}
            aria-labelledby={'remove-title'}
          >
            <h2 id={'remove-title'}>Remove attachment</h2>
            <p>{removing.originalName}</p>
            <p>Removing this attachment cannot be undone by the requester.</p>
            <label className={'field-label'} htmlFor={'removal-reason'}>Removal reason</label>
            <textarea
              autoFocus
              id={'removal-reason'}
              className={'text-field'}
              maxLength={250}
              value={reason}
              aria-invalid={reasonError ? 'true' : undefined}
              aria-describedby={reasonError ? 'removal-reason-error' : undefined}
              onChange={(event) => {
                setReason(event.target.value)
                setReasonError('')
              }}
            />
            <p className={'field-hint'}>{reason.length}/250 characters</p>
            {reasonError && <p className={'field-error'} id={'removal-reason-error'}>{reasonError}</p>}
            <div className={'form-actions'}>
              <AppButton
                variant={'destructive'}
                busy={busy}
                busyLabel={'Removing...'}
                onClick={() => void confirmRemoval()}
              >
                Remove Attachment
              </AppButton>
              <AppButton
                variant={'secondary'}
                disabled={busy}
                onClick={() => {
                  closeRemoval()
                }}
              >
                Cancel
              </AppButton>
            </div>
          </section>
        </div>
      )}
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
      {loadState === 'ready' && ticket && selectedRequester && (
        <TicketDetailContent
          ticket={ticket}
          requesterId={selectedRequester.id}
          onTicketChange={setTicket}
        />
      )}
    </div>
  )
}

export default RequesterTicketDetailPage
