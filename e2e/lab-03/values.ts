export const API_URL = 'http://localhost:3100'
export const E2E_AUTH_FIXTURE_KEY = 'lab3-requester-e2e-auth'
export const E2E_AUTH_EMAIL = 'e2e.lab3.auth@example.test'
export const E2E_INITIAL_PASSWORD = 'E2E initial password 2026!'
export const E2E_REPLACEMENT_PASSWORD = 'E2E replacement password 2026!'
export const E2E_REQUESTER_PASSWORD = 'E2E requester flow password 2026!'

export const E2E_REQUESTER_USERS = [
  {
    fixtureKey: 'lab3-requester-flow-owner',
    name: 'E2E Requester Owner',
    email: 'e2e.lab3.owner@example.test',
  },
  {
    fixtureKey: 'lab3-requester-flow-other',
    name: 'E2E Requester Other',
    email: 'e2e.lab3.other@example.test',
  },
] as const

export const E2E_STAFF_USER = {
  fixtureKey: 'lab3-staff-queue',
  name: 'E2E Queue Staff',
  email: 'e2e.lab3.queue.staff@example.test',
} as const

export const E2E_WORKFLOW_TICKET = 'TKT-20990404-E2E00001'

export const E2E_ADMIN_USER = { fixtureKey: 'lab3-admin-users', name: 'E2E Administrator', email: 'e2e.lab3.admin@example.test' } as const
export const E2E_MANAGED_EMAIL = 'e2e.lab3.managed@example.test'

export const E2E_VISUAL_AUTH_USER = { fixtureKey: 'lab3-requester-visual-auth', name: 'E2E Visual Authentication', email: 'e2e.lab3.visual.auth@example.test' } as const
