import cors from 'cors'
import express from 'express'
import { errorHandler } from './errors/error-handler.js'
import { listCategories, listRelatedSystems } from './references/reference-data.js'
import { listDevelopmentRequesters } from './requesters/development-requesters.js'
import { requireDevelopmentRequester } from './requesters/requester-context.js'
import { createTicket } from './tickets/create-ticket.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    allowedHeaders: [
      'Content-Type',
      'X-Development-Requester-Id',
      'Idempotency-Key',
    ],
  }),
)
app.use(express.json())

app.get('/', (_request, response) => {
  response.json({ service: 'TokTickIT API' })
})

app.get('/api/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'TokTickIT API',
  })
})

app.get('/api/development-requesters', listDevelopmentRequesters)

app.get('/api/categories', listCategories)
app.get('/api/related-systems', listRelatedSystems)
app.post('/api/tickets', requireDevelopmentRequester, createTicket)

app.use(errorHandler)

export default app
