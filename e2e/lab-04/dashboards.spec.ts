import { expect, test, type Page } from '@playwright/test'
import {
  E2E_REQUESTER_PASSWORD,
  E2E_REQUESTER_USERS,
  E2E_ADMIN_USER,
  E2E_STAFF_USER,
  E2E_WORKFLOW_TICKET,
} from '../lab-03/values.js'
import { database } from '../lab-02/database.js'

test.beforeEach(async () => {
  const prisma = await database()
  const ticket = await prisma.ticket.update({
    where: { ticketNumber: E2E_WORKFLOW_TICKET },
    data: {
      status: 'OPEN',
      resolvedAt: null,
      resolutionIndicatedAt: null,
      resolutionIndicatedById: null,
    },
    select: { id: true, workCycle: true },
  })
  const staff = await prisma.user.findUniqueOrThrow({
    where: { fixtureKey: E2E_STAFF_USER.fixtureKey },
    select: { id: true },
  })
  const completedAt = new Date()
  await prisma.actionTaken.upsert({
    where: { fixtureKey: 'lab4-dashboard-performed-action' },
    update: {
      ticketId: ticket.id,
      ticketWorkCycle: ticket.workCycle,
      description: 'E2E completed dashboard Action',
      result: 'E2E completion verified',
      status: 'COMPLETED',
      actionAt: completedAt,
      createdById: staff.id,
      performedById: staff.id,
      assignedToId: null,
      completedAt,
      cancelledAt: null,
    },
    create: {
      fixtureKey: 'lab4-dashboard-performed-action',
      ticketId: ticket.id,
      ticketWorkCycle: ticket.workCycle,
      description: 'E2E completed dashboard Action',
      result: 'E2E completion verified',
      status: 'COMPLETED',
      actionAt: completedAt,
      createdById: staff.id,
      performedById: staff.id,
      completedAt,
      idempotencyKey: '70000000-0000-4000-8000-000000000060',
      requestFingerprint: 'd'.repeat(64),
    },
  })
  await prisma.$disconnect()
})

async function login(page: Page, email: string, heading: string) {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: heading })).toBeVisible()
}

test('Requester dashboard stays owner-scoped and drills into equivalent My Tickets filters', async ({ page }) => {
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await page.getByRole('link', { name: 'Dashboard' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
  await expect(page.getByText(E2E_WORKFLOW_TICKET)).toBeVisible()
  const openCard = page.locator('.dashboard-metric-card').filter({ hasText: 'Open tickets' })
  await expect(openCard.getByText('1', { exact: true })).toBeVisible()
  await openCard.getByRole('link', { name: 'View tickets' }).click()

  await expect(page).toHaveURL(/\/tickets\?scope=open$/)
  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await expect(page.getByText('Showing open tickets.')).toBeVisible()
  await expect(page.getByText(E2E_WORKFLOW_TICKET).first()).toBeVisible()

  await page.goto(`/tickets/${E2E_WORKFLOW_TICKET}`)
  await expect(page.getByRole('heading', { name: E2E_WORKFLOW_TICKET })).toBeVisible()
})

test('Requester dashboard has no page overflow at required widths', async ({ page }) => {
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test('staff direct access receives the safe forbidden state', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { name: 'Forbidden' })).toBeVisible()
  await expect(page.getByText('Your account does not have access to this page.')).toBeVisible()
})

test('Staff operational dashboard drills into the unassigned queue and remains responsive', async ({ page }) => {
  await login(page, E2E_STAFF_USER.email, 'Ticket Queue')
  await page.getByRole('link', { name: 'Dashboard' }).click()

  await expect(page).toHaveURL(/\/staff\/dashboard$/)
  await expect(page.getByRole('heading', { name: 'Operational Dashboard', exact: true })).toBeVisible()
  const summary = page.getByLabel('Operational summary')
  await expect(summary.getByText('Actions assigned to me', { exact: true })).toBeVisible()
  await expect(summary.getByText('Completed by me in 7 days', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account summary' })).toHaveCount(0)

  const unassignedCard = page.locator('.dashboard-metric-card').filter({ hasText: 'Unassigned tickets' })
  await unassignedCard.getByRole('link', { name: 'View queue' }).click()
  await expect(page).toHaveURL(/\/staff\/tickets\?scope=active&ownerId=unassigned$/)
  await expect(page.getByLabel('Ticket Scope')).toHaveValue('active')
  await expect(page.getByLabel('Owner')).toHaveValue('unassigned')

  await page.goto('/staff/dashboard')
  const performedLink = page.locator('#my-performed-actions').getByRole('link', {
    name: new RegExp(E2E_WORKFLOW_TICKET),
  }).first()
  const performedHref = await performedLink.getAttribute('href')
  expect(performedHref).toMatch(/#action-\d+$/)
  await performedLink.click()
  await expect(page).toHaveURL(new RegExp(`/staff/tickets/${E2E_WORKFLOW_TICKET}#action-\\d+$`))
  const actionTarget = page.locator(`#${performedHref!.split('#')[1]}`)
  await expect(actionTarget).toBeFocused()

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/staff/dashboard')
    await expect(page.getByRole('heading', { name: 'Operational Dashboard', exact: true })).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  }
})

test('Administrator sees account summary while Requester is denied operational access', async ({ page }) => {
  await login(page, E2E_ADMIN_USER.email, 'Ticket Queue')
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Operational Dashboard', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Account summary' })).toBeVisible()
  await expect(page.getByText('Active Administrators')).toBeVisible()

  await page.getByRole('button', { name: 'Log out' }).click()
  await login(page, E2E_REQUESTER_USERS[0].email, 'My Tickets')
  await page.goto('/staff/dashboard')
  await expect(page.getByRole('heading', { name: 'Forbidden' })).toBeVisible()
})
