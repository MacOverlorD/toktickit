import { expect, test } from '@playwright/test'
import {
  API_URL,
  E2E_AUTH_EMAIL,
  E2E_INITIAL_PASSWORD,
  E2E_REPLACEMENT_PASSWORD,
} from './values.js'

test('initial login, mandatory password change, logout, and replay denial', async ({
  page,
}) => {
  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel(/^Email/).fill(E2E_AUTH_EMAIL)
  await page.getByLabel(/^Password/).fill(E2E_INITIAL_PASSWORD)
  await page.getByRole('button', { name: 'Show password' }).click()
  await expect(page.getByLabel(/^Password/)).toHaveAttribute('type', 'text')
  expect(await page.evaluate(() => document.cookie)).toBe('')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible()
  const restricted = await page.request.get(API_URL + '/api/categories')
  expect(restricted.status()).toBe(403)

  await page.getByLabel(/^Current password/).fill(E2E_INITIAL_PASSWORD)
  await page.getByLabel(/^New password/).fill(E2E_REPLACEMENT_PASSWORD)
  await page.getByLabel(/^Confirm new password/).fill(E2E_REPLACEMENT_PASSWORD)
  await page.getByRole('button', { name: 'Save password' }).click()

  await expect(page.getByRole('heading', { name: 'My Tickets' })).toBeVisible()
  await expect(page.getByText('E2E Authentication Requester', { exact: true }))
    .toBeVisible()
  expect(await page.evaluate(() => document.cookie)).toBe('')
  expect((await page.request.get(API_URL + '/api/categories')).status()).toBe(200)

  await page.getByRole('button', { name: 'Log out' }).click()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect((await page.request.get(API_URL + '/api/categories')).status()).toBe(401)

  await page.goto('/tickets')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})
