import type { UserRole } from '@prisma/client'

export interface UserSummary {
  id: number
  name: string
  email: string
  role: UserRole
  isActive: boolean
  mustChangePassword: boolean
  version: number
}

export interface ResolvedSession {
  tokenHash: string
  csrfToken: string
  expiresAt: Date
  user: UserSummary
}

export interface AuthResult extends ResolvedSession {
  sessionToken: string
}
