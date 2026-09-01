import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon: ReactNode
  destructive?: boolean
}

function IconButton({
  label,
  icon,
  destructive = false,
  className = '',
  ...buttonProps
}: IconButtonProps) {
  return (
    <span className={'icon-control'}>
      <button
        {...buttonProps}
        className={`icon-button${destructive ? ' is-destructive' : ''} ${className}`.trim()}
        type={buttonProps.type ?? 'button'}
        aria-label={label}
      >
        <span aria-hidden={'true'}>{icon}</span>
      </button>
      <span className={'icon-tooltip'} role={'tooltip'}>{label}</span>
    </span>
  )
}

export default IconButton
