import { AlertTriangle, Circle, CircleDot, Minus } from 'lucide-react'
import type { TicketStatus } from '../../api/tickets'

type TicketBadgeProps =
  | { kind: 'status'; value: TicketStatus }
  | { kind: 'priority'; value: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' }

const priorityPresentation = {
  LOW: { label: 'Low', className: 'low', Icon: Minus },
  MEDIUM: { label: 'Medium', className: 'medium', Icon: Circle },
  HIGH: { label: 'High', className: 'high', Icon: AlertTriangle },
  URGENT: { label: 'Urgent', className: 'urgent', Icon: AlertTriangle },
} as const

const statusLabels: Record<TicketStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  WAITING_FOR_REQUESTER: 'Waiting for Requester',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  REOPENED: 'Reopened',
  CANCELLED: 'Cancelled',
}

function TicketBadge(props: TicketBadgeProps) {
  if (props.kind === 'status') {
    const label = statusLabels[props.value]
    return (
      <span
        className={`ticket-badge badge-status-${props.value.toLowerCase().replaceAll('_', '-')}`}
        aria-label={`Status: ${label}`}
      >
        <CircleDot aria-hidden={'true'} />
        {label}
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
