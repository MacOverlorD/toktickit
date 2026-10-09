import { expect, test, type Page } from '@playwright/test'
import {
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from '../lab-03/values.js'
import { database } from '../lab-02/database.js'

test.beforeAll(async () => {
  const prisma = await database()
  const staff = await prisma.user.findUniqueOrThrow({
    where: { fixtureKey: E2E_STAFF_USER.fixtureKey },
    select: { id: true },
  })
  const ticket = await prisma.ticket.update({
    where: { ticketNumber: E2E_WORKFLOW_TICKET },
    data: {
      ownerId: staff.id,
      status: 'OPEN',
      resolvedAt: null,
      resolutionIndicatedAt: null,
      resolutionIndicatedById: null,
    },
    select: { id: true, workCycle: true },
  })

  await prisma.actionTaken.upsert({
    where: { fixtureKey: 'lab4-visual-planned-action' },
    update: {
      ticketId: ticket.id,
      ticketWorkCycle: ticket.workCycle,
      description: 'Verify the requester can sign in after the access reset',
      status: 'PLANNED',
      actionAt: null,
      result: null,
      createdById: staff.id,
      performedById: null,
      assignedToId: staff.id,
      completedAt: null,
      cancelledAt: null,
    },
    create: {
      fixtureKey: 'lab4-visual-planned-action',
      ticketId: ticket.id,
      ticketWorkCycle: ticket.workCycle,
      description: 'Verify the requester can sign in after the access reset',
      status: 'PLANNED',
      createdById: staff.id,
      assignedToId: staff.id,
      idempotencyKey: '71000000-0000-4000-8000-000000000061',
      requestFingerprint: 'e'.repeat(64),
    },
  })
  await prisma.$disconnect()
})

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'boundary-320', width: 320, height: 700 },
] as const

async function login(page: Page, email: string, heading: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

async function capture(page: Page, folder: string, name: string) {
  const root = process.env.PROMOTE_LAB4_EVIDENCE === '1'
    ? 'artifacts/lab-04/screenshots'
    : 'artifacts/lab-04/test-results/visual-captures'
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.evaluate(() => scrollTo(0, 0))
    await expect(page.locator('main')).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({
      path: root + '/' + folder + '/' + name + '-' + viewport.name + '.png',
      fullPage: true,
    })
  }
}

async function captureRegion(page: Page, folder: string, name: string) {
  const root = process.env.PROMOTE_LAB4_EVIDENCE === '1'
    ? 'artifacts/lab-04/screenshots'
    : 'artifacts/lab-04/test-results/visual-captures'
  const actions = page.getByRole('region', { name: 'Actions Taken' })
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await expect(actions).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await actions.screenshot({
      path: root + '/' + folder + '/' + name + '-' + viewport.name + '.png',
    })
  }
}

test('captures Requester dashboard evidence at required viewports', async ({ page }) => {
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await capture(page, 'requester-dashboard', 'dashboard')
})

test('captures operational dashboard and Actions evidence at required viewports', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Operational Dashboard', exact: true })).toBeVisible()
  await capture(page, 'operations-dashboard', 'dashboard')
  await page.goto('/staff/tickets/' + E2E_WORKFLOW_TICKET)
  await expect(page.getByRole('heading', { name: 'Actions Taken' })).toBeVisible()
  await captureRegion(page, 'actions', 'ticket-actions')
  await capture(page, 'ticket-workflow', 'staff-ticket-detail')
})
