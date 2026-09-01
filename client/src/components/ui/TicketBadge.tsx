import { AlertTriangle, Circle, CircleDot, Minus } from 'lucide-react'

type TicketBadgeProps =
  | { kind: 'status'; value: 'NEW' }
  | { kind: 'priority'; value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }

const priorityPresentation = {
  LOW: { label: 'Low', className: 'low', Icon: Minus },
  MEDIUM: { label: 'Medium', className: 'medium', Icon: Circle },
  HIGH: { label: 'High', className: 'high', Icon: AlertTriangle },
  URGENT: { label: 'Urgent', className: 'urgent', Icon: AlertTriangle },
} as const

function TicketBadge(props: TicketBadgeProps) {
  if (props.kind === 'status') {
    return (
      <span className={'ticket-badge badge-status-new'} aria-label={'Status: New'}>
        <CircleDot aria-hidden={'true'} />
        New
      </span>
    )
  }

  const { label, className, Icon } = priorityPresentation[props.value]

  return (
    <span
      className={`ticket-badge badge-priority-${className}`}
      aria-label={`Requested priority: ${label}`}
    >
      <Icon aria-hidden={'true'} />
      {label}
    </span>
  )
}

export default TicketBadge
