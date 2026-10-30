import { test as setup } from '@playwright/test'
import { signInWithCode } from '../src/sign-in'
import { BUSINESS_URL, OWNER_STATE, SALON } from '../src/stack'

/**
 * The salon's owner signs in once per run and the flows reuse the session (`storageState`): the api hands a number
 * one code a minute (`RESEND_SEC`), so a sign-in per test would be refused.
 */
setup('the owner signs in to the business app', async ({ page }) => {
  await page.goto(`${BUSINESS_URL}/login`)
  await signInWithCode(page, SALON.ownerPhone)
  await page.getByRole('link', { name: 'Open the calendar now' }).click()
  await page.waitForURL(`**/w/${SALON.slug}/calendar**`)
  await page.context().storageState({ path: OWNER_STATE })
})
