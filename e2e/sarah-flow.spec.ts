import { test, expect, type Page } from '@playwright/test'

// Manohar (Individual Taxpayer) starts every demo from a clean slate: onboarding
// first, then a home page with no preset requests, messages, or questions until
// the preparer acts. This verifies the step-by-step design.
test.describe('Manohar onboarding + clean start', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
    await page.goto('/login')
    await page.getByRole('button', { name: /Continue as Manohar/ }).click()
    await expect(page).toHaveURL(/\/my-return$/)
  })

  test('a fresh client sees the onboarding landing, not preset work', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /start your personal tax return/i })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start my return' })).toBeVisible()
    // No preset mortgage request or next-action card before onboarding.
    await expect(page.getByRole('heading', { name: /mortgage interest statement/i })).toHaveCount(0)
  })

  test('completing onboarding lands on a clean home with no action required', async ({ page }) => {
    await completeIndividualOnboarding(page)
    await expect(page).toHaveURL(/\/my-return$/)
    await expect(page.getByRole('heading', { name: 'No action is currently required from you' })).toBeVisible()
  })

  test('no preset messages or questions for a freshly onboarded client', async ({ page }) => {
    await completeIndividualOnboarding(page)

    await page.goto('/my-return/messages')
    await expect(page.getByText('No conversations yet')).toBeVisible()

    await page.goto('/my-return/questions')
    await expect(page.getByText('No questions yet').first()).toBeVisible()
  })
})

/** Drive the 3-step individual onboarding wizard to completion. */
async function completeIndividualOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Start my return' }).click()
  await expect(page).toHaveURL(/\/my-return\/onboarding$/)
  // Step 1 → Step 2 → Step 3 (answers are optional to advance).
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByRole('button', { name: /Continue to my document checklist/ }).click()
  await expect(page).toHaveURL(/\/my-return$/)
}
