import { BUSINESS_URL, CLIENT_URL } from '../src/stack'
import { expect, test } from '../src/test'

test('«Try the business app» opens the demo without a sign-in, and «Log in» leaves it', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/en`)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Try the business app' })).toHaveAttribute(
    'href',
    `${BUSINESS_URL}/try`,
  )

  // the jobs make the demo workspace within a minute of the stack starting
  await expect(async () => {
    await page.goto(`${BUSINESS_URL}/try`)
    await page.waitForURL('**/w/*/calendar**', { timeout: 5_000 })
  }).toPass({ timeout: 90_000 })

  await expect(page.getByText('A workspace to try Ýeral. Changes reset every night.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeHidden()

  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL('**/login')
  await expect(page.getByRole('link', { name: 'try the business app' })).toBeVisible()
})
