import type { Page } from '@playwright/test'

/** Clear all localStorage and navigate to the login page with fresh demo data. */
export async function resetAndLogin(page: Page) {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    // Ensure the Playwright-only flag is cleared in case it was set.
    sessionStorage.clear()
  })
  await page.goto('/login')
}

/** Log in by clicking the "Continue as <firstName>" button. */
export async function loginAs(page: Page, firstName: string) {
  await page.getByRole('button', { name: new RegExp(`Continue as ${firstName}`) }).click()
}

/** Switch user via the top-bar WorkspaceSwitcher. */
export async function switchDemoUser(page: Page) {
  // The WorkspaceSwitcher opens on the user-name button area.
  await page.getByRole('button', { name: /^[A-Z]{2}$/ }).click() // avatar initials button
  // Then click "Switch demo user".
  await page.getByRole('menuitem', { name: /Switch demo user/ }).click()
}
