import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type AppButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'destructive'

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant
  busy?: boolean
  busyLabel?: string
  icon?: ReactNode
}

function AppButton({
  variant = 'primary',
  busy = false,
  busyLabel = 'Working...',
  icon,
  className = '',
  disabled,
  children,
  ...buttonProps
}: AppButtonProps) {
  return (
    <button
      {...buttonProps}
      className={`app-button app-button-${variant} ${className}`.trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <span className={'button-spinner'} aria-hidden={'true'} />
      ) : (
        icon && <span className={'button-icon'} aria-hidden={'true'}>{icon}</span>
      )}
      <span>{busy ? busyLabel : children}</span>
    </button>
  )
}

export default AppButton
