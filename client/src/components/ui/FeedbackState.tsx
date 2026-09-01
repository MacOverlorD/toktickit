import {
  CircleAlert,
  CircleCheck,
  Inbox,
  LoaderCircle,
  SearchX,
} from 'lucide-react'
import type { ReactNode } from 'react'

export type FeedbackVariant =
  | 'loading'
  | 'empty'
  | 'no-results'
  | 'error'
  | 'success'

interface FeedbackStateProps {
  variant: FeedbackVariant
  title: string
  message: string
  action?: ReactNode
}

const feedbackIcons = {
  loading: LoaderCircle,
  empty: Inbox,
  'no-results': SearchX,
  error: CircleAlert,
  success: CircleCheck,
} as const

function FeedbackState({ variant, title, message, action }: FeedbackStateProps) {
  const Icon = feedbackIcons[variant]
  const role = variant === 'error' ? 'alert' : 'status'

  return (
    <section
      className={`feedback-state feedback-${variant}`}
      role={role}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
    >
      <Icon
        className={variant === 'loading' ? 'is-spinning' : undefined}
        aria-hidden={'true'}
      />
      <div className={'feedback-copy'}>
        <h2>{title}</h2>
        <p>{message}</p>
      </div>
      {action && <div className={'feedback-action'}>{action}</div>}
    </section>
  )
}

export default FeedbackState
