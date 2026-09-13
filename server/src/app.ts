import cors from 'cors'
import express from 'express'
import {
  getAttachmentContent,
  listAttachments,
  parseAttachmentUpload,
  requireOwnedAttachmentTicket,
  removeAttachment,
  uploadAttachment,
} from './attachments/attachment-handlers.js'
import {
  requireAuthenticatedSession,
  requireCompletedPassword,
  requireMutationCsrf,
} from './auth/auth-middleware.js'
import { authRouter } from './auth/auth-router.js'
import { ApiError } from './errors/api-error.js'
import { errorHandler } from './errors/error-handler.js'
import { listCategories, listRelatedSystems } from './references/reference-data.js'
import { requireRequester } from './requesters/requester-context.js'
import { createTicket } from './tickets/create-ticket.js'
import { getTicketDetail } from './tickets/get-ticket-detail.js'
import { listTickets } from './tickets/list-tickets.js'
import { queueRouter } from './staff/queue-router.js'

const app = express()
const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:5173'

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Idempotency-Key',
      'X-CSRF-Token',
    ],
  }),
)
app.use(express.json({ limit: '64kb' }))

app.get('/', (_request, response) => {
  response.json({ service: 'TokTickIT API' })
})

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  })
})

app.use('/api/auth', authRouter)

app.use(
  '/api',
  requireAuthenticatedSession,
  requireCompletedPassword,
  requireMutationCsrf,
)

app.get('/api/categories', listCategories)
app.use('/api/staff', queueRouter)
app.get('/api/related-systems', listRelatedSystems)
app.get('/api/tickets', requireRequester, listTickets)
app.post('/api/tickets', requireRequester, createTicket)
app.get('/api/tickets/:ticketNumber', requireRequester, getTicketDetail)
app.get(
  '/api/tickets/:ticketNumber/attachments',
  requireRequester,
  listAttachments,
)
app.post(
  '/api/tickets/:ticketNumber/attachments',
  requireRequester,
  requireOwnedAttachmentTicket,
  parseAttachmentUpload,
  uploadAttachment,
)
app.get(
  '/api/tickets/:ticketNumber/attachments/:attachmentId/content',
  requireRequester,
  getAttachmentContent,
)
app.delete(
  '/api/tickets/:ticketNumber/attachments/:attachmentId',
  requireRequester,
  removeAttachment,
)

app.use((_request, _response, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', 'API route was not found.'))
})
app.use(errorHandler)

export default app
