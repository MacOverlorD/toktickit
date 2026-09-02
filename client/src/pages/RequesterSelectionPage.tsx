import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppButton, FeedbackState, SelectField } from '../components/ui'
import { useRequester } from '../requesters/RequesterContext'

function RequesterSelectionPage() {
  const navigate = useNavigate()
  const {
    loadStatus,
    refreshRequesters,
    requesters,
    selectedRequester,
    validateAndSelectRequester,
  } = useRequester()
  const [requesterId, setRequesterId] = useState('')
  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (loadStatus === 'idle') {
      void refreshRequesters().catch(() => undefined)
    }
  }, [loadStatus, refreshRequesters])

  useEffect(() => {
    if (selectedRequester) {
      setRequesterId(String(selectedRequester.id))
    }
  }, [selectedRequester])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedRequesterId = Number(requesterId)

    if (!Number.isSafeInteger(parsedRequesterId) || parsedRequesterId <= 0) {
      setSelectionError('Select an active Development Requester to continue.')
      return
    }

    setSubmitting(true)
    setSelectionError(null)

    try {
      const selectionResult = await validateAndSelectRequester(parsedRequesterId)
      if (selectionResult !== 'selected') {
        setRequesterId('')
        setSelectionError(
          selectionResult === 'inactive'
            ? 'That Development Requester is no longer active. Select another requester.'
            : 'This browser could not save the requester selection. Check storage permissions and try again.',
        )
        return
      }

      navigate('/tickets', { replace: true })
    } catch {
      setSelectionError('Unable to verify the Development Requester. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={'page-container requester-selection-page'}>
      <header className={'page-header'}>
        <p className={'page-kicker'}>TokTickIT</p>
        <h1>Select Development Requester</h1>
        <p className={'page-description'}>
          Select a Development Requester for Lab 2 testing. This is not a secure login.
        </p>
      </header>

      {loadStatus === 'loading' && (
        <FeedbackState
          variant={'loading'}
          title={'Loading requesters'}
          message={'Retrieving active Development Requesters.'}
        />
      )}

      {loadStatus === 'error' && (
        <FeedbackState
          variant={'error'}
          title={'Requesters unavailable'}
          message={'We could not load Development Requesters. Please try again.'}
          action={
            <AppButton
              variant={'secondary'}
              onClick={() => void refreshRequesters().catch(() => undefined)}
            >
              Retry
            </AppButton>
          }
        />
      )}

      {loadStatus === 'ready' && requesters.length === 0 && (
        <FeedbackState
          variant={'empty'}
          title={'No active requesters'}
          message={'No Development Requester is available for Lab 2 testing.'}
        />
      )}

      {loadStatus === 'ready' && requesters.length > 0 && (
        <form className={'requester-selection-form'} onSubmit={handleSubmit}>
          <SelectField
            id={'development-requester'}
            label={'Development Requester'}
            required
            value={requesterId}
            error={selectionError ?? undefined}
            onChange={(event) => {
              setRequesterId(event.target.value)
              setSelectionError(null)
            }}
          >
            <option value={''}>Select a requester</option>
            {requesters.map((requester) => (
              <option key={requester.id} value={requester.id}>
                {requester.name} ({requester.email})
              </option>
            ))}
          </SelectField>

          <div className={'form-actions'}>
            <AppButton
              type={'submit'}
              disabled={!requesterId}
              busy={submitting}
              busyLabel={'Verifying requester...'}
            >
              Continue
            </AppButton>
          </div>
        </form>
      )}
    </div>
  )
}

export default RequesterSelectionPage
