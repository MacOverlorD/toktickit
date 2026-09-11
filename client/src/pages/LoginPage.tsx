import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  AuthRequestError,
  roleHome,
  useAuth,
} from '../auth/AuthContext'
import { AppButton, FeedbackState, TextField } from '../components/ui'

function LoginPage() {
  const { login, state } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

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
  if (state.status === 'authenticated') {
    return (
      <Navigate
        to={
          state.payload.user.mustChangePassword
            ? '/change-password'
            : roleHome(state.payload.user.role)
        }
        replace
      />
    )
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setRetryAfter(null)
    try {
      const payload = await login(email, password)
      navigate(
        payload.user.mustChangePassword
          ? '/change-password'
          : roleHome(payload.user.role),
        { replace: true },
      )
    } catch (caught) {
      if (caught instanceof AuthRequestError) {
        setError(
          caught.code === 'INVALID_CREDENTIALS'
            ? 'Cannot sign in with these credentials. Check your details or contact an Administrator.'
            : caught.message,
        )
        setRetryAfter(caught.retryAfterSeconds)
      } else {
        setError('TokTickIT could not be reached. Try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={'auth-page'}>
      <section className={'auth-card'} aria-labelledby={'login-title'}>
        <span className={'auth-brand'}>TokTickIT</span>
        <h1 id={'login-title'}>Sign in</h1>
        <p className={'page-description'}>
          Use your service desk account to continue.
        </p>
        {error && (
          <div className={'feedback-panel feedback-error'} role={'alert'}>
            <strong>Sign in failed</strong>
            <span>{error}</span>
            {retryAfter && <span>Try again in about {retryAfter} seconds.</span>}
          </div>
        )}
        <form className={'auth-form'} onSubmit={submit}>
          <TextField
            autoComplete={'username'}
            label={'Email'}
            maxLength={254}
            onChange={(event) => setEmail(event.target.value)}
            required
            type={'email'}
            value={email}
          />
          <div className={'password-field'}>
            <TextField
              autoComplete={'current-password'}
              label={'Password'}
              onChange={(event) => setPassword(event.target.value)}
              required
              type={showPassword ? 'text' : 'password'}
              value={password}
            />
            <button
              className={'password-toggle'}
              type={'button'}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword
                ? <EyeOff aria-hidden={'true'} />
                : <Eye aria-hidden={'true'} />}
            </button>
          </div>
          <AppButton
            busy={busy}
            busyLabel={'Signing in...'}
            icon={<LogIn />}
            type={'submit'}
          >
            Sign in
          </AppButton>
        </form>
      </section>
    </main>
  )
}

export default LoginPage
