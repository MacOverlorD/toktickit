import { expect, test } from '@playwright/test'
import { E2E_REQUESTER_PASSWORD, E2E_STAFF_USER } from './values.js'

test('staff queue remains usable across desktop, tablet, and mobile', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/^Email/).fill(E2E_STAFF_USER.email)
  await page.getByLabel(/^Password/).fill(E2E_REQUESTER_PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Ticket Queue' })).toBeVisible()

  const views = [
    { name: 'desktop', width: 1440, height: 900, controlColumns: 3 },
    { name: 'tablet', width: 820, height: 1180, controlColumns: 2 },
    { name: 'mobile', width: 390, height: 844, controlColumns: 1 },
  ]
  for (const view of views) {
    await page.setViewportSize({ width: view.width, height: view.height })
    const columns = await page.locator('.staff-queue-controls').evaluate(element =>
      getComputedStyle(element).gridTemplateColumns.split(' ').length,
    )
    expect(columns).toBe(view.controlColumns)
    if (view.width >= 992) {
      await expect(page.getByRole('table', { name: 'Staff ticket queue' })).toBeVisible()
      await expect(page.locator('.staff-ticket-list')).toBeHidden()
      await expect(page.getByRole('columnheader')).toHaveCount(8)
    } else {
      await expect(page.locator('.staff-ticket-list')).toBeVisible()
      await expect(page.locator('.staff-ticket-table-wrapper')).toBeHidden()
    }
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )).toBe(true)
    await page.screenshot({
      path: `artifacts/lab-03/staff-queue-${view.name}.png`,
      fullPage: true,
    })
  }
  await page.getByRole('link', { name: 'Open ticket' }).first().click()
  await expect(page.getByRole('heading', { name: 'Staff Ticket Detail' })).toBeVisible()
  await expect(page).toHaveURL(/\/staff\/tickets\/TKT-/)
})
