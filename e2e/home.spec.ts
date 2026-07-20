import { test, expect } from '@playwright/test'

test('login screen lists the demo accounts', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'AI Tax Platform' })).toBeVisible()
  await expect(page.getByText('Select a demo account to explore the platform.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue as Manohar/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue as Maya/ })).toBeVisible()
})
