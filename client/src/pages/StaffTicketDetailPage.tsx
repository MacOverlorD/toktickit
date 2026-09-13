import { Link, useParams } from 'react-router-dom'

export default function StaffTicketDetailPage() {
  const { ticketNumber } = useParams()
  return <div className={'page-container'}>
    <h1>Staff Ticket Detail</h1>
    <p>{ticketNumber}</p>
    <p>The full staff detail screen is delivered in Issue 6.</p>
    <Link to={'/staff/tickets'}>Back to queue</Link>
  </div>
}
