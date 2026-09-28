import { CheckCircle2, ClipboardList, LockKeyhole, Plus, RotateCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActionsTakenError,
  assignActionTaken,
  completeActionTaken,
  createActionTaken,
  editActionTaken,
  listActionsTaken,
  transitionActionTaken,
  type ActionDraft,
  type ActionTaken,
} from '../api/actions-taken'
import type { SafeOwner } from '../api/ticket-workflow'
import { AppButton } from './ui'

type Mode = 'staff' | 'requester'
type Editor = { kind: 'create' } | { kind: 'edit'; action: ActionTaken } | { kind: 'complete'; action: ActionTaken }

const count = (value: string) => Array.from(value).length
const editable = (action: ActionTaken) => ['PLANNED', 'IN_PROGRESS'].includes(action.status)
const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
    : 'Not recorded'

function newKey() {
  return globalThis.crypto?.randomUUID?.() ??
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (letter) => {
      const value = Math.floor(Math.random() * 16)
      return (letter === 'x' ? value : (value & 0x3) | 0x8).toString(16)
    })
}

function friendlyError(error: unknown) {
  if (!(error instanceof ActionsTakenError)) return 'The request failed safely. Your entered data is still here; try again.'
  if (error.code === 'STALE_RESOURCE') return 'This Action changed elsewhere. Reload latest before trying again.'
  if (error.code === 'ACTION_NOT_EDITABLE') return 'This Action is now read-only. Reload latest to see its current state.'
  if (error.code === 'INELIGIBLE_ASSIGNEE') return 'Choose an active IT Staff or Administrator assignee.'
  if (error.code === 'INVALID_ACTION_TRANSITION') return 'That transition is no longer available. Reload latest.'
  if (error.code === 'FORBIDDEN') return 'You are not permitted to change Actions Taken.'
  return error.message
}

function toLocalDateTime(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toInstant(value: string) {
  return value ? new Date(value).toISOString() : null
}

interface ActionFormProps {
  editor: Editor
  assignees: SafeOwner[]
  busy: boolean
  serverError: string
  fieldErrors: Record<string, string>
  onCancel: () => void
  onSubmit: (draft: ActionDraft & { result: string }) => Promise<void>
}

function ActionForm({ editor, assignees, busy, serverError, fieldErrors, onCancel, onSubmit }: ActionFormProps) {
  const action = editor.kind === 'create' ? null : editor.action
  const completing = editor.kind === 'complete'
  const [description, setDescription] = useState(action?.description ?? '')
  const [result, setResult] = useState(action?.result ?? '')
  const [actionAt, setActionAt] = useState(toLocalDateTime(action?.actionAt ?? null))
  const [assignedToUserId, setAssignedToUserId] = useState(action?.assignedTo?.id ? String(action.assignedTo.id) : '')
  const [followUpRequired, setFollowUpRequired] = useState(action?.followUpRequired ?? false)
  const [followUpNote, setFollowUpNote] = useState(action?.followUpNote ?? '')
  const [attachmentNotes, setAttachmentNotes] = useState(action?.attachmentNotes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const resultRef = useRef<HTMLTextAreaElement>(null)
  const followUpRef = useRef<HTMLTextAreaElement>(null)
  const attachmentRef = useRef<HTMLTextAreaElement>(null)
  const assigneeRef = useRef<HTMLSelectElement>(null)
  const refs: Record<string, React.RefObject<HTMLElement | null>> = {
    description: descriptionRef,
    result: resultRef,
    followUpNote: followUpRef,
    attachmentNotes: attachmentRef,
    assignedToUserId: assigneeRef,
  }

  useEffect(() => {
    const first = Object.keys(fieldErrors)[0]
    if (first) window.setTimeout(() => refs[first]?.current?.focus(), 0)
  }, [fieldErrors])

  function validate() {
    const next: Record<string, string> = {}
    if (!completing && (!description.trim() || count(description.trim()) > 2000))
      next.description = 'Description must contain 1 to 2000 characters.'
    if (result && count(result.trim()) > 4000) next.result = 'Result must contain at most 4000 characters.'
    if (completing && !result.trim()) next.result = 'Result is required to complete an Action.'
    if (followUpRequired && (!followUpNote.trim() || count(followUpNote.trim()) > 1000))
      next.followUpNote = 'Follow-up Note is required and must contain 1 to 1000 characters.'
    if (attachmentNotes && count(attachmentNotes.trim()) > 1000)
      next.attachmentNotes = 'Evidence notes must contain at most 1000 characters.'
    if (actionAt && new Date(actionAt).getTime() > Date.now() + 5 * 60_000)
      next.actionAt = 'Action date/time cannot be more than five minutes in the future.'
    setErrors(next)
    const first = Object.keys(next)[0]
    if (first) window.setTimeout(() => refs[first]?.current?.focus(), 0)
    return first === undefined
  }

  async function submit() {
    if (!validate()) return
    await onSubmit({
      description: description.trim(),
      result: result.trim() || null,
      actionAt: toInstant(actionAt),
      assignedToUserId: assignedToUserId ? Number(assignedToUserId) : null,
      followUpRequired,
      followUpNote: followUpRequired ? followUpNote.trim() : null,
      attachmentNotes: attachmentNotes.trim() || null,
    } as ActionDraft & { result: string })
  }

  const errorFor = (name: string) => errors[name] ?? fieldErrors[name]
  return (
    <div className={'action-editor'} aria-label={completing ? 'Complete Action' : action ? 'Edit Action' : 'Create Action'}>
      <h3>{completing ? 'Complete Action' : action ? 'Edit Action' : 'New Action Taken'}</h3>
      {serverError && <p className={'attachment-action-error'} role={'alert'}>{serverError}</p>}
      {!completing && (
        <>
          <label className={'field-label'} htmlFor={'action-description'}>Description</label>
          <textarea id={'action-description'} ref={descriptionRef} className={'text-field'} value={description}
            aria-invalid={!!errorFor('description')} onChange={(event) => setDescription(event.target.value)} disabled={busy} />
          <span className={'field-hint'}>{count(description)}/2000 characters</span>
          {errorFor('description') && <p className={'field-error'} role={'alert'}>{errorFor('description')}</p>}
        </>
      )}
      <div className={'action-form-grid'}>
        <div>
          <label className={'field-label'} htmlFor={'action-at'}>Action date/time <span>(optional)</span></label>
          <input id={'action-at'} className={'text-field'} type={'datetime-local'} value={actionAt}
            aria-invalid={!!errorFor('actionAt')} onChange={(event) => setActionAt(event.target.value)} disabled={busy} />
          {errorFor('actionAt') && <p className={'field-error'} role={'alert'}>{errorFor('actionAt')}</p>}
        </div>
        {!completing && (
          <div>
            <label className={'field-label'} htmlFor={'action-assignee'}>Assigned to</label>
            <select id={'action-assignee'} ref={assigneeRef} className={'select-field'} value={assignedToUserId}
              onChange={(event) => setAssignedToUserId(event.target.value)} disabled={busy}>
              <option value={''}>Unassigned</option>
              {assignees.map((person) => <option key={person.id} value={person.id}>{person.name} — {person.role === 'ADMINISTRATOR' ? 'Administrator' : 'IT Staff'}</option>)}
            </select>
          </div>
        )}
      </div>
      <label className={'field-label'} htmlFor={'action-result'}>Result {completing ? '(required)' : '(optional)'}</label>
      <textarea id={'action-result'} ref={resultRef} className={'text-field'} value={result}
        aria-invalid={!!errorFor('result')} onChange={(event) => setResult(event.target.value)} disabled={busy} />
      <span className={'field-hint'}>{count(result)}/4000 characters</span>
      {errorFor('result') && <p className={'field-error'} role={'alert'}>{errorFor('result')}</p>}
      {!completing && (
        <>
          <label className={'action-checkbox'}>
            <input type={'checkbox'} checked={followUpRequired} disabled={busy} onChange={(event) => {
              setFollowUpRequired(event.target.checked)
              if (!event.target.checked) setFollowUpNote('')
            }} />
            Follow-Up Required
          </label>
          {followUpRequired && (
            <>
              <label className={'field-label'} htmlFor={'action-follow-up'}>Follow-up Note</label>
              <textarea id={'action-follow-up'} ref={followUpRef} className={'text-field'} value={followUpNote}
                aria-invalid={!!errorFor('followUpNote')} onChange={(event) => setFollowUpNote(event.target.value)} disabled={busy} />
              <span className={'field-hint'}>{count(followUpNote)}/1000 characters</span>
              {errorFor('followUpNote') && <p className={'field-error'} role={'alert'}>{errorFor('followUpNote')}</p>}
            </>
          )}
          <label className={'field-label'} htmlFor={'action-attachment-notes'}>Evidence notes <span>(shared text; no file is attached)</span></label>
          <textarea id={'action-attachment-notes'} ref={attachmentRef} className={'text-field'} value={attachmentNotes}
            aria-invalid={!!errorFor('attachmentNotes')} onChange={(event) => setAttachmentNotes(event.target.value)} disabled={busy} />
          <span className={'field-hint'}>{count(attachmentNotes)}/1000 characters</span>
          {errorFor('attachmentNotes') && <p className={'field-error'} role={'alert'}>{errorFor('attachmentNotes')}</p>}
        </>
      )}
      <div className={'form-actions'}>
        <AppButton busy={busy} busyLabel={'Saving...'} onClick={() => void submit()}>{completing ? 'Complete Action' : action ? 'Save Action' : 'Create Action'}</AppButton>
        <AppButton variant={'secondary'} disabled={busy} onClick={onCancel}>Cancel</AppButton>
      </div>
    </div>
  )
}

interface Props {
  ticketNumber: string
  mode: Mode
  assignees?: SafeOwner[]
}

export default function ActionsTakenSection({ ticketNumber, mode, assignees = [] }: Props) {
  const [items, setItems] = useState<ActionTaken[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [editor, setEditor] = useState<Editor | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState('')
  const [idempotencyKey, setIdempotencyKey] = useState(newKey)
  const [assignments, setAssignments] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    setState('loading')
    setError('')
    try {
      const next = await listActionsTaken(ticketNumber)
      setItems(next)
      setAssignments(Object.fromEntries(next.map((item) => [item.id, item.assignedTo?.id ? String(item.assignedTo.id) : ''])))
      setState('ready')
    } catch (value) {
      setError(friendlyError(value))
      setState('error')
    }
  }, [ticketNumber])

  useEffect(() => { void load() }, [load])

  function replace(next: ActionTaken) {
    setItems((current) => current.map((item) => item.id === next.id ? next : item))
    setAssignments((current) => ({ ...current, [next.id]: next.assignedTo?.id ? String(next.assignedTo.id) : '' }))
  }

  async function guarded(work: () => Promise<void>) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setFieldErrors({})
    setSuccess('')
    try {
      await work()
    } catch (value) {
      setError(friendlyError(value))
      if (value instanceof ActionsTakenError) setFieldErrors(value.fieldErrors)
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function submit(draft: ActionDraft & { result: string }) {
    await guarded(async () => {
      if (!editor) return
      if (editor.kind === 'create') {
        const created = await createActionTaken(ticketNumber, draft, idempotencyKey)
        setItems((current) => [created, ...current.filter((item) => item.id !== created.id)])
        setIdempotencyKey(newKey())
        setSuccess('Action created.')
      } else if (editor.kind === 'edit') {
        const { assignedToUserId: _assigned, ...data } = draft
        replace(await editActionTaken(ticketNumber, editor.action.id, { ...data, expectedVersion: editor.action.version! }))
        setSuccess('Action updated.')
      } else {
        replace(await completeActionTaken(ticketNumber, editor.action.id, editor.action.version!, draft.result, draft.actionAt))
        setSuccess('Action completed.')
      }
      setEditor(null)
    })
  }

  async function assign(action: ActionTaken) {
    await guarded(async () => {
      const value = assignments[action.id] ?? ''
      replace(await assignActionTaken(ticketNumber, action.id, value ? Number(value) : null, action.version!))
      setSuccess('Assignment updated.')
    })
  }

  async function transition(action: ActionTaken, kind: 'start' | 'cancel') {
    if (kind === 'cancel' && !window.confirm(`Cancel Action ${action.id}? This is terminal.`)) return
    await guarded(async () => {
      replace(await transitionActionTaken(ticketNumber, action.id, kind, action.version!))
      setSuccess(kind === 'start' ? 'Action started.' : 'Action cancelled.')
    })
  }

  return (
    <section className={'detail-section actions-taken-section'} aria-labelledby={'actions-taken-heading'}>
      <div className={'detail-section-heading'}>
        <h2 id={'actions-taken-heading'}><ClipboardList aria-hidden={'true'} /> Actions Taken</h2>
        <span>{mode === 'requester' ? <><LockKeyhole aria-hidden={'true'} /> Shared read-only history</> : `${items.length} recorded`}</span>
      </div>
      <p className={'action-visibility-note'}>{mode === 'requester'
        ? 'Work updates shared with you. Assignment, internal control data, and cancellation audit details are private.'
        : 'Formal work history. Public Comments and Internal Notes remain separate communication channels.'}</p>
      {mode === 'staff' && !editor && state === 'ready' && (
        <AppButton onClick={() => { setError(''); setFieldErrors({}); setEditor({ kind: 'create' }) }}><Plus aria-hidden={'true'} /> Add Action Taken</AppButton>
      )}
      {success && <p className={'attachment-action-success'} role={'status'}><CheckCircle2 aria-hidden={'true'} /> {success}</p>}
      {error && !editor && <p className={'attachment-action-error'} role={state === 'error' ? 'status' : 'alert'}>{error}</p>}
      {(error.includes('Reload latest') || error.includes('read-only')) && (
        <AppButton variant={'secondary'} disabled={busy} onClick={() => { setEditor(null); void load() }}><RotateCw aria-hidden={'true'} /> Reload latest</AppButton>
      )}
      {editor && <ActionForm editor={editor} assignees={assignees} busy={busy} serverError={error}
        fieldErrors={fieldErrors} onCancel={() => { setEditor(null); setError(''); setFieldErrors({}) }} onSubmit={submit} />}
      {state === 'loading' && <p className={'actions-loading'} role={'status'}>Loading Actions Taken...</p>}
      {state === 'error' && (
        <AppButton variant={'secondary'} onClick={() => void load()}>Retry Actions Taken</AppButton>
      )}
      {state === 'ready' && items.length === 0 && !editor && <div className={'actions-empty'}><strong>No Actions Taken yet</strong><span>{mode === 'staff' ? 'Record the first work item for this Ticket.' : 'Work updates will appear here when staff records them.'}</span></div>}
      {state === 'ready' && items.length > 0 && (
        <ol className={'actions-list'}>
          {items.map((action) => (
            <li key={action.id}>
              <article id={`action-${action.id}`} className={'action-card'} tabIndex={-1}>
                <header>
                  <div><strong>Action #{action.id}</strong><span>Created {formatDate(action.createdAt)} by {action.createdBy.name}</span></div>
                  <span className={`action-status action-status-${action.status.toLowerCase()}`}>{action.status.replace('_', ' ')}</span>
                </header>
                <dl className={'action-detail-grid'}>
                  <div><dt>Description</dt><dd>{action.description}</dd></div>
                  <div><dt>Action date/time</dt><dd>{formatDate(action.actionAt)}</dd></div>
                  <div><dt>Result</dt><dd>{action.result || 'Not recorded'}</dd></div>
                  <div><dt>Performed by</dt><dd>{action.performedBy?.name ?? 'Not completed'}</dd></div>
                  <div><dt>Follow-up</dt><dd>{action.followUpRequired ? action.followUpNote : 'Not required'}</dd></div>
                  <div><dt>Evidence notes (shared text)</dt><dd>{action.attachmentNotes || 'None'}</dd></div>
                  {mode === 'staff' && <><div><dt>Assigned to</dt><dd>{action.assignedTo?.name ?? 'Unassigned'}</dd></div><div><dt>Work cycle / version</dt><dd>{action.ticketWorkCycle} / {action.version}</dd></div></>}
                </dl>
                {mode === 'staff' && editable(action) && (
                  <div className={'action-controls'}>
                    <div className={'action-assignment-control'}>
                      <label className={'field-label'} htmlFor={`action-assignee-${action.id}`}>Reassign Action #{action.id}</label>
                      <select id={`action-assignee-${action.id}`} className={'select-field'} value={assignments[action.id] ?? ''} disabled={busy}
                        onChange={(event) => setAssignments((current) => ({ ...current, [action.id]: event.target.value }))}>
                        <option value={''}>Unassigned</option>
                        {assignees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
                      </select>
                      <AppButton variant={'secondary'} disabled={busy} onClick={() => void assign(action)}>Save Assignment</AppButton>
                    </div>
                    <div className={'form-actions'}>
                      <AppButton variant={'secondary'} disabled={busy} onClick={() => { setError(''); setFieldErrors({}); setEditor({ kind: 'edit', action }) }}>Edit</AppButton>
                      {action.status === 'PLANNED' && <AppButton variant={'secondary'} disabled={busy} onClick={() => void transition(action, 'start')}>Start</AppButton>}
                      <AppButton disabled={busy} onClick={() => { setError(''); setFieldErrors({}); setEditor({ kind: 'complete', action }) }}>Complete</AppButton>
                      <AppButton variant={'destructive'} disabled={busy} onClick={() => void transition(action, 'cancel')}>Cancel Action</AppButton>
                    </div>
                  </div>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
