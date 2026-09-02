import { Send, Trash2 } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { getCategories, type Category } from '../api/categories'
import { getRelatedSystems, type RelatedSystem } from '../api/related-systems'
import {
  createTicket,
  TicketApiError,
  type CreatedTicket,
  type RequestedPriority,
} from '../api/tickets'
import {
  AppButton,
  FeedbackState,
  IconButton,
  ReadOnlyField,
  SelectField,
  TextField,
} from '../components/ui'
import { useRequester } from '../requesters/RequesterContext'
import {
  attachmentKey,
  formatFileSize,
  MAX_ATTACHMENT_COUNT,
  validateAttachment,
} from '../tickets/attachment-selection'

type LoadState = 'loading' | 'ready' | 'error'
type FieldErrors = Record<string, string>

interface SelectedAttachment {
  key: string
  file: File
  error: string | null
}

const priorities: RequestedPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const fieldOrder = [
  'categoryId',
  'relatedSystemId',
  'summary',
  'requestedPriority',
  'description',
] as const

function validateForm(values: {
  categoryId: string
  relatedSystemId: string
  summary: string
  requestedPriority: string
  description: string
}) {
  const errors: FieldErrors = {}
  if (!/^[1-9]\d*$/.test(values.categoryId)) {
    errors.categoryId = 'Select a Category.'
  }
  if (!/^[1-9]\d*$/.test(values.relatedSystemId)) {
    errors.relatedSystemId = 'Select a Related System.'
  }
  const summaryLength = values.summary.trim().length
  if (summaryLength < 5 || summaryLength > 120) {
    errors.summary = 'Ticket Summary must be 5-120 characters after trimming.'
  }
  if (!priorities.includes(values.requestedPriority as RequestedPriority)) {
    errors.requestedPriority = 'Select a Requested Priority.'
  }
  const descriptionLength = values.description.trim().length
  if (descriptionLength < 10 || descriptionLength > 5_000) {
    errors.description = 'Description must be 10-5,000 characters after trimming.'
  }
  return errors
}

function createSubmissionKey() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
  return (
    hex.slice(0, 4).join('') + '-' +
    hex.slice(4, 6).join('') + '-' +
    hex.slice(6, 8).join('') + '-' +
    hex.slice(8, 10).join('') + '-' +
    hex.slice(10).join('')
  )
}

function CreateTicketPage() {
  const { selectedRequester, setUnsavedTicketDraft } = useRequester()
  const [categories, setCategories] = useState<Category[]>([])
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [categoryId, setCategoryId] = useState('')
  const [relatedSystemId, setRelatedSystemId] = useState('')
  const [summary, setSummary] = useState('')
  const [requestedPriority, setRequestedPriority] = useState('')
  const [description, setDescription] = useState('')
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([])
  const [attachmentMessage, setAttachmentMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null)
  const submissionRef = useRef<{ fingerprint: string; key: string } | null>(null)
  const submissionLock = useRef(false)

  const loadReferences = useCallback(async () => {
    setLoadState('loading')
    try {
      const [categoryItems, systemItems] = await Promise.all([
        getCategories(),
        getRelatedSystems(),
      ])
      setCategories(categoryItems)
      setRelatedSystems(systemItems)
      setLoadState('ready')
    } catch {
      setLoadState('error')
    }
  }, [])

  useEffect(() => {
    void loadReferences()
  }, [loadReferences])

  const requesterValue = selectedRequester
    ? selectedRequester.name + ' (' + selectedRequester.email + ')'
    : 'No requester selected'
  const referencesAvailable =
    loadState === 'ready' &&
    categories.length > 0 &&
    relatedSystems.length > 0
  const formValues = useMemo(
    () => ({
      categoryId,
      relatedSystemId,
      summary,
      requestedPriority,
      description,
    }),
    [categoryId, description, relatedSystemId, requestedPriority, summary],
  )
  const hasDraft =
    createdTicket === null &&
    (categoryId !== '' ||
      relatedSystemId !== '' ||
      summary !== '' ||
      requestedPriority !== '' ||
      description !== '' ||
      attachments.length > 0)

  useEffect(() => {
    setUnsavedTicketDraft(hasDraft)
    return () => setUnsavedTicketDraft(false)
  }, [hasDraft, setUnsavedTicketDraft])

  function focusFirstError(errors: FieldErrors) {
    const firstField = fieldOrder.find((field) => errors[field])
    if (firstField) document.getElementById(firstField)?.focus()
  }

  useEffect(() => {
    if (!submitting && Object.keys(fieldErrors).length > 0) {
      focusFirstError(fieldErrors)
    }
  }, [fieldErrors, submitting])

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? [])
    let limitReached = false
    let duplicateFound = false
    const next = [...attachments]
    const knownKeys = new Set(attachments.map(({ key }) => key))
    for (const file of incoming) {
      const key = attachmentKey(file)
      if (knownKeys.has(key)) {
        duplicateFound = true
        continue
      }
      if (next.length >= MAX_ATTACHMENT_COUNT) {
        limitReached = true
        continue
      }
      knownKeys.add(key)
      next.push({ key, file, error: validateAttachment(file) })
    }
    setAttachments(next)
    setAttachmentMessage(
      limitReached
        ? 'A maximum of five files can be selected.'
        : duplicateFound
          ? 'A duplicate file selection was ignored.'
          : '',
    )
    event.target.value = ''
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      submissionLock.current ||
      !selectedRequester ||
      loadState !== 'ready'
    ) return

    const errors = validateForm(formValues)
    setFieldErrors(errors)
    setSubmitError('')
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors)
      return
    }

    const input = {
      categoryId: Number(categoryId),
      relatedSystemId: Number(relatedSystemId),
      summary: summary.trim(),
      requestedPriority: requestedPriority as RequestedPriority,
      description: description.trim(),
    }
    const fingerprint = JSON.stringify(input)
    if (submissionRef.current?.fingerprint !== fingerprint) {
      submissionRef.current = { fingerprint, key: createSubmissionKey() }
    }

    submissionLock.current = true
    setSubmitting(true)
    try {
      const result = await createTicket(
        input,
        selectedRequester.id,
        submissionRef.current.key,
      )
      setCreatedTicket(result.data)
    } catch (error) {
      if (
        error instanceof TicketApiError &&
        Object.keys(error.fieldErrors).length > 0
      ) {
        setFieldErrors(error.fieldErrors)
        focusFirstError(error.fieldErrors)
      }
      setSubmitError(
        'The ticket could not be created. Your entries are still available. Try again.',
      )
    } finally {
      submissionLock.current = false
      setSubmitting(false)
    }
  }

  if (createdTicket) {
    return (
      <div className={'page-container page-container-narrow'}>
        <header className={'page-header'}>
          <h1>Ticket created</h1>
          <p className={'page-description'}>
            Your IT support request was submitted successfully.
          </p>
        </header>
        <FeedbackState
          variant={'success'}
          title={createdTicket.ticketNumber}
          message={
            'Status: New. Created ' +
            new Date(createdTicket.ticketDate).toLocaleString() +
            '.'
          }
          action={
            <Link className={'app-button app-button-primary'} to={'/tickets'}>
              Go to My Tickets
            </Link>
          }
        />
      </div>
    )
  }

  return (
    <div className={'page-container'}>
      <header className={'page-header'}>
        <h1>Create Ticket</h1>
        <p className={'page-description'}>Submit a new IT support request.</p>
      </header>

      {loadState === 'loading' && (
        <FeedbackState
          variant={'loading'}
          title={'Loading ticket options'}
          message={'Categories and Related Systems are being loaded.'}
        />
      )}
      {loadState === 'error' && (
        <FeedbackState
          variant={'error'}
          title={'Ticket options unavailable'}
          message={'The form options could not be loaded. Try again.'}
          action={
            <AppButton
              variant={'secondary'}
              onClick={() => void loadReferences()}
            >
              Retry
            </AppButton>
          }
        />
      )}
      {loadState === 'ready' && !referencesAvailable && (
        <FeedbackState
          variant={'empty'}
          title={'No active ticket options'}
          message={
            'An active Category and Related System are required before a ticket can be created.'
          }
        />
      )}

      <form className={'create-ticket-form'} noValidate onSubmit={handleSubmit}>
        <fieldset disabled={submitting}>
          <legend className={'visually-hidden'}>Ticket information</legend>
          <div className={'ticket-form-grid'}>
            <ReadOnlyField
              label={'Ticket Number'}
              value={'Assigned after submission'}
            />
            <ReadOnlyField
              label={'Ticket Date'}
              value={'Assigned by server after submission'}
            />
            <div className={'form-span-full'}>
              <ReadOnlyField label={'Requester'} value={requesterValue} />
            </div>
            <SelectField
              id={'categoryId'}
              label={'Category'}
              required
              value={categoryId}
              disabled={!referencesAvailable || submitting}
              error={fieldErrors.categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value={''}>Select Category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectField>
            <SelectField
              id={'relatedSystemId'}
              label={'Related System'}
              required
              value={relatedSystemId}
              disabled={!referencesAvailable || submitting}
              error={fieldErrors.relatedSystemId}
              onChange={(event) => setRelatedSystemId(event.target.value)}
            >
              <option value={''}>Select Related System</option>
              {relatedSystems.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </SelectField>
            <div className={'form-span-full'}>
              <TextField
                id={'summary'}
                label={'Ticket Summary'}
                required
                value={summary}
                maxLength={120}
                disabled={submitting}
                error={fieldErrors.summary}
                hint={summary.length + '/120 characters'}
                onChange={(event) => setSummary(event.target.value)}
              />
            </div>
            <SelectField
              id={'requestedPriority'}
              label={'Requested Priority'}
              required
              value={requestedPriority}
              disabled={submitting}
              error={fieldErrors.requestedPriority}
              onChange={(event) => setRequestedPriority(event.target.value)}
            >
              <option value={''}>Select Requested Priority</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority.charAt(0) + priority.slice(1).toLowerCase()}
                </option>
              ))}
            </SelectField>
            <div className={'form-span-full field-group'}>
              <label className={'field-label'} htmlFor={'description'}>
                <span>
                  Description
                  <span className={'required-marker'} aria-label={'required'}>*</span>
                </span>
              </label>
              <textarea
                id={'description'}
                className={
                  'text-field ticket-description' +
                  (fieldErrors.description ? ' is-invalid' : '')
                }
                value={description}
                maxLength={5_000}
                disabled={submitting}
                required
                aria-invalid={fieldErrors.description ? 'true' : undefined}
                aria-describedby={
                  'description-count' +
                  (fieldErrors.description ? ' description-error' : '')
                }
                onChange={(event) => setDescription(event.target.value)}
              />
              <p className={'field-hint'} id={'description-count'}>
                {description.length}/5,000 characters
              </p>
              {fieldErrors.description && (
                <p className={'field-error'} id={'description-error'}>
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className={'form-span-full attachment-picker field-group'}>
              <label className={'field-label'} htmlFor={'attachments'}>
                Attachments (optional)
              </label>
              <input
                id={'attachments'}
                className={'text-field file-field'}
                type={'file'}
                multiple
                accept={'.jpg,.jpeg,.png,.webp,.pdf'}
                disabled={
                  submitting || attachments.length >= MAX_ATTACHMENT_COUNT
                }
                aria-describedby={'attachment-hint attachment-message'}
                onChange={handleFiles}
              />
              <p className={'field-hint'} id={'attachment-hint'}>
                JPEG, PNG, WEBP, or PDF. Maximum 5 MiB per file and five files.
              </p>
              <p
                className={'field-error'}
                id={'attachment-message'}
                aria-live={'polite'}
              >
                {attachmentMessage}
              </p>
              {attachments.length > 0 && (
                <ul
                  className={'attachment-selection-list'}
                  aria-label={'Selected attachments'}
                >
                  {attachments.map((attachment) => (
                    <li
                      key={attachment.key}
                      className={attachment.error ? 'is-invalid' : ''}
                    >
                      <span className={'attachment-details'}>
                        <strong>{attachment.file.name}</strong>
                        <span>
                          {formatFileSize(attachment.file.size)}
                          {' / '}
                          {attachment.file.type || 'Unknown type'}
                        </span>
                        <span>{attachment.error ?? 'Pending'}</span>
                      </span>
                      <IconButton
                        label={
                          'Remove ' +
                          attachment.file.name +
                          ' from selection'
                        }
                        icon={<Trash2 />}
                        destructive
                        disabled={submitting}
                        onClick={() =>
                          setAttachments((items) =>
                            items.filter(({ key }) => key !== attachment.key),
                          )
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </fieldset>
        {submitError && (
          <p className={'submit-error'} role={'alert'}>{submitError}</p>
        )}
        <div className={'form-actions'}>
          <AppButton
            type={'submit'}
            busy={submitting}
            busyLabel={'Creating ticket...'}
            disabled={!referencesAvailable}
            icon={<Send />}
          >
            Create Ticket
          </AppButton>
          <Link className={'app-button app-button-secondary'} to={'/tickets'}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

export default CreateTicketPage
