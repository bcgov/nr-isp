import { expect, test } from '@playwright/test'

test.describe('frontend smoke', () => {
  test('landing page offers IDIR login', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'ISP', exact: true })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: 'Interior Selling Price' }),
    ).toBeVisible()
    await expect(page.getByRole('img', { name: 'Government of British Columbia' })).toBeVisible()
    await expect(page.getByRole('button', { name: /log in with idir/i })).toBeEnabled()
  })

  test('known deep links show login rather than not found', async ({ page }) => {
    await page.goto('/isp-inbox')
    await expect(page).toHaveURL(/\/isp-inbox$/)
    await expect(page.getByRole('button', { name: /log in with idir/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: '404' })).toHaveCount(0)
  })

  test('unknown routes show not found', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible()
    await page.getByRole('button', { name: /back home/i }).click()
    await expect(page.getByRole('button', { name: /log in with idir/i })).toBeVisible()
  })
})
