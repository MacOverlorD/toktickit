import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AuthRequestError,
  roleHome,
  useAuth,
} from '../auth/AuthContext'
import { AppButton, FeedbackState, TextField } from '../components/ui'

function localPasswordError(password: string) {
  if (/[\uD800-\uDFFF]/u.test(password)) {
    return 'Password contains an invalid Unicode character.'
  }
  const length = [...password].length
  if (
    length < 15 ||
    length > 128 ||
    new TextEncoder().encode(password).length > 512 ||
    password.trim().length === 0
  ) {
    return 'Use 15 to 128 characters and no more than 512 UTF-8 bytes.'
  }
  return ''
}

function ChangePasswordPage() {
  const { changePassword, state } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  if (state.status === 'loading') {
    return (
      <main className={'auth-page'}>
        <FeedbackState
          variant={'loading'}
          title={'Checking your session'}
          message={'Verifying your TokTickIT account.'}
        />
      </main>
    )
  }
  if (state.status === 'anonymous') return <Navigate to={'/login'} replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || state.status !== 'authenticated') return

    const errors: Record<string, string> = {}
    if (!currentPassword) errors.currentPassword = 'Enter the current password.'
    const policyError = localPasswordError(newPassword)
    if (policyError) errors.newPassword = policyError
    if (newPassword === currentPassword) {
      errors.newPassword = 'Choose a password different from the current password.'
    }
    if (confirmPassword !== newPassword) {
      errors.confirmPassword = 'Password confirmation must match.'
    }
    setFieldErrors(errors)
    setGeneralError('')
    if (Object.keys(errors).length > 0) return

    setBusy(true)
    try {
      const payload = await changePassword(
        currentPassword,
        newPassword,
        confirmPassword,
      )
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      navigate(roleHome(payload.user.role), { replace: true })
    } catch (caught) {
      if (caught instanceof AuthRequestError) {
        setFieldErrors(caught.fieldErrors)
        setGeneralError(caught.message)
      } else {
        setGeneralError('The password could not be changed. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={'auth-page'}>
      <section className={'auth-card'} aria-labelledby={'change-password-title'}>
        <span className={'auth-brand'}>TokTickIT</span>
        <h1 id={'change-password-title'}>Change password</h1>
        <p className={'page-description'}>
          {state.payload.user.mustChangePassword
            ? 'Replace the initial password before entering TokTickIT.'
            : 'Choose a new password for your account.'}
        </p>
        <p className={'auth-policy'}>
          Use 15 to 128 characters. Spaces, case, and Unicode are preserved.
        </p>
        {generalError && (
          <div className={'feedback-panel feedback-error'} role={'alert'}>
            <strong>Password change failed</strong>
            <span>{generalError}</span>
          </div>
        )}
        <form className={'auth-form'} onSubmit={submit}>
          <TextField
            autoComplete={'current-password'}
            error={fieldErrors.currentPassword}
            label={'Current password'}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            type={'password'}
            value={currentPassword}
          />
          <TextField
            autoComplete={'new-password'}
            error={fieldErrors.newPassword}
            hint={'15-128 characters; maximum 512 UTF-8 bytes.'}
            label={'New password'}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            type={'password'}
            value={newPassword}
          />
          <TextField
            autoComplete={'new-password'}
            error={fieldErrors.confirmPassword}
            label={'Confirm new password'}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type={'password'}
            value={confirmPassword}
          />
          <AppButton
            busy={busy}
            busyLabel={'Saving password...'}
            icon={<KeyRound />}
            type={'submit'}
          >
            Save password
          </AppButton>
        </form>
      </section>
    </main>
  )
}

export default ChangePasswordPage
