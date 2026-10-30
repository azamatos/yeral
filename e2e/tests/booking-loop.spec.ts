import { expect, test, type Browser, type Locator, type Page } from '@playwright/test'
import { signInWithCode } from '../src/sign-in'
import { BUSINESS_URL, CLIENT_URL, clientName, freshPhone, OWNER_STATE, SALON } from '../src/stack'

/**
 * The booking loop of P4 slice 3 (book C-06, C-12, B-19, B-20; log/2026-10-25-slice-3-plan.md «Done when»): a new
 * number books two services on the salon's page with the inline sign-in, the owner's calendar shows the request
 * through the push channel (ADR 0028), the owner answers, and the client's My bookings follows within seconds.
 * Two browser contexts, one per person (skill `testing`).
 */

/** The owner, signed in once per run (tests/owner.setup.ts), opens the salon's calendar on a day. */
async function openOwnerCalendar(browser: Browser, date = ''): Promise<Page> {
  const page = await (await browser.newContext({ storageState: OWNER_STATE })).newPage()
  await page.goto(`${BUSINESS_URL}/w/${SALON.slug}/calendar${date && `?date=${date}`}`)
  await expect(page.getByRole('region', { name: /^Calendar, / })).toBeVisible()
  return page
}

/**
 * The request's drawer, opened from the calendar's address (`?request=`): the block on the grid may sit under a
 * neighbour's, which a click can't tell apart.
 */
async function openRequest(owner: Page, date: string, code: string): Promise<Locator> {
  await owner.goto(`${BUSINESS_URL}/w/${SALON.slug}/calendar?date=${date}&request=${code}`)
  const drawer = owner.getByRole('dialog', { name: 'Request' })
  await expect(drawer).toBeVisible()
  return drawer
}

/**
 * The client picks two services on the salon's page, any specialist and the first free time, then signs in on the
 * confirm step. Returns the booked day (`YYYY-MM-DD`), read from the booking page's address.
 */
async function chooseAndSignIn(page: Page, phone: string): Promise<string> {
  await page.goto(`${CLIENT_URL}/en/b/${SALON.slug}`)
  // the page comes rendered from the server: a click before React takes it over is lost, so the first one retries
  await expect(async () => {
    await page
      .getByRole('button', { name: /^Select: / })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /^Selected: / })).toHaveCount(1, { timeout: 1_000 })
  }).toPass()
  await page
    .getByRole('button', { name: /^Select: / })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /^Selected: / })).toHaveCount(2)
  await page.getByRole('link', { name: 'Continue' }).click()

  await page.getByRole('radio', { name: 'Any specialist' }).check()
  await page.getByRole('button', { name: 'Continue' }).click()

  // the first free time; a day with none sends to the next free day
  const slot = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ })
  const nextFree = page.getByRole('button', { name: /^Next free day/ })
  await expect(slot.first().or(nextFree)).toBeVisible()
  if (await nextFree.isVisible()) await nextFree.click()
  await slot.first().click()
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Confirm your number' }).click()
  await signInWithCode(page.getByRole('dialog'), phone, clientName(phone))
  await expect(page.getByRole('img', { name: 'Number confirmed' })).toBeVisible()
  const date = new URL(page.url()).searchParams.get('date')
  expect(date, 'the booking page carries the chosen day').toMatch(/^\d{4}-\d{2}-\d{2}$/)
  return date!
}

/** «Send booking», then the sent page's booking code. */
async function sendBooking(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Send booking' }).click()
  await expect(page.getByRole('heading', { name: 'Booking sent' })).toBeVisible()
  const code = (await page.getByText(/^Booking code:/).textContent())?.match(/YR-\d+/)?.[0]
  expect(code, 'the sent page shows the booking code').toBeTruthy()
  return code!
}

/** The client's row in My bookings. */
const bookingRow = (page: Page) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Glow Studio, .*: open the booking$/ }) })

test('a new client books two services, the owner confirms, the client sees it confirmed', async ({ browser }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  const date = await chooseAndSignIn(client, phone)

  // the owner looks at the booked day before the request is sent: it must arrive without a reload (ADR 0028)
  const owner = await openOwnerCalendar(browser, date)
  const code = await sendBooking(client)

  await client.goto(`${CLIENT_URL}/en/account/bookings`)
  const row = bookingRow(client).first()
  await expect(row).toContainText('Waiting for the business to confirm')
  await expect(row).toContainText('Pending')

  await expect(owner.getByRole('button', { name: clientName(phone) })).toBeVisible()
  const drawer = await openRequest(owner, date, code)
  await drawer.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(owner.getByText('Booking confirmed · the client is notified')).toBeVisible()

  // the client's page follows through the push channel, no reload
  await expect(row).toContainText('Confirmed')
  await expect(row).not.toContainText('Waiting for the business to confirm')
})

test('the owner declines with two offered times, the client takes one and is confirmed at it', async ({ browser }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  const date = await chooseAndSignIn(client, phone)
  const code = await sendBooking(client)
  await client.goto(`${CLIENT_URL}/en/account/bookings`)
  const row = bookingRow(client).first()
  await expect(row).toContainText('Pending')

  const owner = await openOwnerCalendar(browser)
  const drawer = await openRequest(owner, date, code)
  await drawer.getByRole('button', { name: 'Decline' }).click()
  const decline = owner.getByRole('dialog', { name: 'Decline the request' })
  await decline.getByRole('radio', { name: 'This time isn’t free' }).check()
  await decline.getByRole('switch', { name: 'Offer another time' }).check()
  const offers = decline.getByRole('button', { name: /^\d{1,2}:\d{2}$/ })
  await expect(offers.first()).toBeVisible()
  await offers.nth(0).click()
  await offers.nth(1).click()
  await expect(decline.getByText('2 / 3 times selected')).toBeVisible()
  await decline.getByRole('button', { name: 'Decline' }).click()
  await expect(owner.getByText('Request declined · the client sees the reason and 2 other times')).toBeVisible()

  // the client sees the decline and the offers, takes the first one, and is confirmed at once (book B-20)
  await expect(row).toContainText('The business declined')
  const offered = row.getByRole('group', { name: 'Offered times' })
  // «Book {day · range}», its visible text the start time
  const pick = offered.getByRole('button', { name: /^Book / }).first()
  const time = (await pick.textContent())?.trim()
  await pick.click()
  await client.getByRole('button', { name: 'Book', exact: true }).click()
  await expect(client.getByText(/^Booked: /)).toBeVisible()
  const made = bookingRow(client).filter({ hasText: 'Confirmed' }).first()
  await expect(made).toBeVisible()
  await expect(made).toContainText(time!)
})
