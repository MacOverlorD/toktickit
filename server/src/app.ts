import cors from 'cors'
import express from 'express'
import prisma from './prisma.js'

const app = express()

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
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

app.get('/api/categories', async (_request, response, next) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        id: 'asc',
      },
    })

    response.status(200).json(categories)
  } catch (error) {
    next(error)
  }
})

export default app
