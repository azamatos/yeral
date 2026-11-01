import { createHmac } from 'node:crypto'
import type { Page } from '@playwright/test'
import { API_URL, freshPhone, SALON } from '../src/stack'
import { expect, test } from '../src/test'

const PASSWORD = 'a long enough password'

/** The authenticator app's code for now (RFC 6238: SHA-1, 30 seconds, 6 digits), from the key the setup shows. */
function appCode(key: string): string {
  const bits = [...key].map((ch) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(ch).toString(2).padStart(5, '0')).join('')
  const secret = Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => parseInt(byte, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)))
  const mac = createHmac('sha1', secret).update(counter).digest()
  const at = mac[19]! & 0x0f
  return String(mac.readUInt32BE(at) & 0x7fffffff)
    .slice(-6)
    .padStart(6, '0')
}

/** The server command's account, by the test hook: a login and a setup link. */
async function invited(page: Page) {
  const login = `e2e-${Date.now()}`
  const res = await page.request.post(`${API_URL}/v1/e2e/admin-invite`, { data: { login, name: 'Merjen' } })
  expect(res.ok(), `the e2e hook answers (${res.status()}): is E2E_HOOKS on in the api?`).toBe(true)
  const { url } = (await res.json()) as { url: string }
  return { login, url }
}

/** The setup link, all the way: the password, the authenticator, the recovery codes. Signed in at the end. */
async function setUp(page: Page, url: string): Promise<string[]> {
  await page.goto(url)
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Password again').fill(PASSWORD)
  await page.getByRole('button', { name: 'Continue' }).click()
  const key = await page.getByLabel('Key').inputValue()
  await page.getByLabel('6-digit code').fill(appCode(key))
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByRole('heading', { name: 'Save your recovery codes' })).toBeVisible()
  const codes = await page.getByRole('list', { name: 'Your recovery codes' }).getByRole('listitem').allTextContents()
  expect(codes).toHaveLength(10)
  await page.getByLabel("I've saved them").check()
  await page.getByRole('button', { name: 'Open Ýeral Admin' }).click()
  await page.waitForURL('**/businesses')
  return codes
}

test('a teammate sets up from a link, and signs in again with a recovery code', async ({ page }) => {
  const { login, url } = await invited(page)
  const codes = await setUp(page, url)

  await page.getByRole('button', { name: 'Open your account menu' }).click()
  await page.getByRole('menuitem', { name: 'Log out' }).click()
  await page.waitForURL('**/login')

  await page.getByLabel('Login').fill(login)
  await page.getByLabel('Password').fill('not the password')
  await page.getByLabel('Authenticator code').fill(codes[0]!)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('alert')).toHaveText('The login, password or code is wrong.')

  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByLabel('Authenticator code').fill(codes[1]!)
  await page.getByRole('button', { name: 'Log in' }).click()
  await page.waitForURL('**/businesses')
  await expect(page.getByRole('heading', { level: 1, name: 'Businesses' })).toBeVisible()
})

test('the team hides a live business and shows it again', async ({ page }) => {
  const { url } = await invited(page)
  await setUp(page, url)

  await page.getByRole('tab', { name: 'Live' }).click()
  await page.getByRole('searchbox').fill(SALON.slug)
  await page.getByRole('searchbox').press('Enter')
  // the seed has a second Glow Studio: the address tells them apart
  await page
    .getByRole('row')
    .filter({ has: page.getByText(SALON.slug, { exact: true }) })
    .getByRole('link')
    .click()
  await expect(page.getByRole('heading', { level: 1, name: SALON.name })).toBeVisible()

  await page.getByRole('button', { name: 'Hide' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Reason').fill('Only a test')
  await dialog.getByRole('button', { name: 'Hide' }).click()
  await expect(page.getByText('Hidden: Only a test')).toBeVisible()

  // the flows after this one book here
  await page.getByRole('button', { name: 'Show again' }).click()
  await expect(page.getByText('Hidden: Only a test')).toBeHidden()
})

test('the team adds a business for an owner it has met', async ({ page }) => {
  const { url } = await invited(page)
  await setUp(page, url)

  await page.getByRole('link', { name: 'Add a business' }).click()
  await page.getByLabel('Business name').fill('A place the team met')
  await page.getByLabel('Category').selectOption({ index: 1 })
  await page.getByLabel("Owner's name").fill('Aýgül')
  await page.getByLabel("Owner's mobile").fill(freshPhone())
  await page.getByRole('button', { name: 'Add the business' }).click()

  await expect(page.getByRole('heading', { level: 1, name: 'A place the team met' })).toBeVisible()
  await expect(page.getByText("Its owner is still setting it up, so there's nothing to decide yet.")).toBeVisible()
})
