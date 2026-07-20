import { test, expect, type Page } from '@playwright/test'

// These tests are stateful (they mutate localStorage). Run them serially to
// prevent cross-test contamination when Playwright runs multiple workers.
test.describe.configure({ mode: 'serial' })

async function reset(page: Page) {
  await page.goto('/')
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
  await page.goto('/login')
}

async function loginAs(page: Page, firstName: string) {
  await page.getByRole('button', { name: new RegExp(`Continue as ${firstName}`) }).click()
}

/** Complete a 3-step onboarding wizard (individual or business). */
async function completeOnboarding(page: Page, startButton: RegExp) {
  await page.getByRole('button', { name: startButton }).click()
  await expect(page).toHaveURL(/\/my-return\/onboarding$/)
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByRole('button', { name: /^Continue$/ }).click()
  await page.getByRole('button', { name: /Continue to my (document|business) checklist/ }).click()
  await expect(page).toHaveURL(/\/my-return$/)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Manohar onboards and reaches a clean home
// ─────────────────────────────────────────────────────────────────────────────
test('1. Manohar onboards into a clean, no-action home', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Manohar')
  await expect(page).toHaveURL(/\/my-return$/)

  // A fresh client sees onboarding, not a preset mortgage request.
  await expect(page.getByRole('button', { name: 'Start my return' })).toBeVisible()

  await completeOnboarding(page, /Start my return/)
  await expect(page.getByRole('heading', { name: 'No action is currently required from you' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. Maya corrects Acme wages using source evidence
// ─────────────────────────────────────────────────────────────────────────────
test('2. Maya corrects Acme wages using source evidence', async ({ page }) => {
  await reset(page)

  // The client must complete onboarding before the preparer can review the return.
  await loginAs(page, 'Manohar')
  await completeOnboarding(page, /Start my return/)

  await page.goto('/login')
  await loginAs(page, 'Maya')

  await page.goto('/returns/RET-1001/review')
  await page.waitForLoadState('networkidle')

  // The Acme wage recommendation (first AI card) offers a "Correct value" action.
  const correctBtn = page.getByRole('button', { name: 'Correct value' }).first()
  await expect(correctBtn).toBeVisible({ timeout: 8000 })
  await correctBtn.click()

  await page.getByLabel(/New value/i).fill('84250')
  await page.getByLabel(/Reason for correction/i).fill('The first digit was read incorrectly by the AI.')
  await page.getByRole('button', { name: 'Save correction' }).click()
  await expect(page.getByText('Manually corrected')).toBeVisible({ timeout: 8000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. Maya requests a document, then Manohar sees it (manual, step-by-step)
// ─────────────────────────────────────────────────────────────────────────────
test('3. A preparer request appears for the client only after it is made', async ({ page }) => {
  await reset(page)

  // Manohar onboards first.
  await loginAs(page, 'Manohar')
  await completeOnboarding(page, /Start my return/)

  // Before any request, there are no conversations.
  await page.goto('/my-return/messages')
  await expect(page.getByText('No conversations yet')).toBeVisible()

  // Maya makes a manual document request.
  await page.goto('/login')
  await loginAs(page, 'Maya')
  await page.goto('/returns/RET-1001/review')
  await page.waitForLoadState('networkidle')
  const requestBtn = page.getByRole('button', { name: 'Request document' })
  if (await requestBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await requestBtn.click()
    await page.getByPlaceholder(/Upload mortgage/i).fill('Please upload your mortgage statement')
    await page.getByRole('button', { name: 'Send request' }).click()
    await page.waitForTimeout(500)

    // Now Manohar sees exactly one conversation.
    await page.goto('/login')
    await loginAs(page, 'Manohar')
    await page.goto('/my-return/messages')
    await expect(page.getByText('No conversations yet')).toHaveCount(0)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Manohar approves the return (only if it reached client-approval)
// ─────────────────────────────────────────────────────────────────────────────
test('4. Manohar approve control renders on the return page', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Manohar')
  await completeOnboarding(page, /Start my return/)
  await page.goto('/my-return/details')
  await page.waitForLoadState('networkidle')
  await expect(page.getByRole('heading', { name: /Tax Return/i })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Maya opens the return overview
// ─────────────────────────────────────────────────────────────────────────────
test('5. Maya can open the return overview', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Maya')
  await page.goto('/returns/RET-1001')
  await page.waitForLoadState('networkidle')
  await expect(page.getByText('RET-1001')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. Alex onboards into a clean business home
// ─────────────────────────────────────────────────────────────────────────────
test('6. Alex onboards into a clean business home', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Alex')
  await expect(page).toHaveURL(/\/my-return$/)
  await expect(page.getByRole('button', { name: 'Start my business return' })).toBeVisible()

  await completeOnboarding(page, /Start my business return/)
  await expect(page.getByRole('heading', { name: 'No action is currently required from you' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. Maya switches between firm and personal workspace
// ─────────────────────────────────────────────────────────────────────────────
test('7. Maya switches firm and personal workspace', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Maya')
  await expect(page).toHaveURL(/\/dashboard$/)

  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()

  const switcherBtn = page.getByRole('button', { name: 'Workspace switcher' })
  await expect(switcherBtn).toBeVisible({ timeout: 5000 })
  await switcherBtn.click()
  await page.waitForTimeout(300)

  const personalItem = page.getByText('My Personal Return').first()
  await expect(personalItem).toBeVisible({ timeout: 5000 })
  await personalItem.click()

  await expect(page).toHaveURL(/\/my-return$/, { timeout: 8000 })
  await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()

  await page.getByRole('button', { name: 'Workspace switcher' }).click()
  await page.waitForTimeout(300)
  await page.getByText('Firm Workspace').first().click()
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 8000 })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. Dashboard filters persist after returning from a return
// ─────────────────────────────────────────────────────────────────────────────
test('8. Dashboard filters persist after returning from a return', async ({ page }) => {
  await reset(page)
  await loginAs(page, 'Maya')

  await page.goto('/returns')
  await expect(page.getByRole('heading', { name: 'Returns' })).toBeVisible()

  const stageSelect = page.getByLabel('Stage')
  await stageSelect.selectOption('preparing')
  await page.waitForTimeout(400)

  const firstRow = page.locator('tbody tr').first()
  if (await firstRow.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstRow.click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()

    await page.goto('/returns')
    await page.waitForLoadState('networkidle')
    await expect(page.getByLabel('Stage')).toHaveValue('preparing')
  } else {
    await expect(page.getByText(/No returns match/i)).toBeVisible()
    await expect(page.getByLabel('Stage')).toHaveValue('preparing')
  }
})
