import { expect, type APIRequestContext, type Browser, type BrowserContextOptions, type Locator, type Page } from '@playwright/test'
import { signInWithCode } from './sign-in'
import { API_URL, BUSINESS_URL, CLIENT_URL, clientName, OWNER_STATE, SALON } from './stack'

/**
 * The steps the flows share (book C-06, C-12, B-19): a client books on the salon's page with the inline sign-in, the
 * owner answers from the calendar's request drawer, the client's My bookings row follows through the push channel
 * (ADR 0028). One browser context per person (skill `testing`).
 */

/** The owner, signed in once per run (tests/owner.setup.ts), opens the salon's calendar on a day. */
export async function openOwnerCalendar(browser: Browser, date = ''): Promise<Page> {
  const page = await (await browser.newContext({ storageState: OWNER_STATE })).newPage()
  await page.goto(`${BUSINESS_URL}/w/${SALON.slug}/calendar${date && `?date=${date}`}`)
  await expect(page.getByRole('region', { name: /^Calendar, / })).toBeVisible()
  return page
}

/**
 * The request's drawer, opened from the calendar's address (`?request=`): the block on the grid may sit under a
 * neighbour's, which a click can't tell apart.
 */
export async function openRequest(owner: Page, date: string, code: string): Promise<Locator> {
  await owner.goto(`${BUSINESS_URL}/w/${SALON.slug}/calendar?date=${date}&request=${code}`)
  const drawer = owner.getByRole('dialog', { name: 'Request' })
  await expect(drawer).toBeVisible()
  return drawer
}

/** The owner confirms the request from its drawer (opened straight away, one page load); the calendar page stays open for the test. */
export async function confirmAsOwner(browser: Browser, date: string, code: string): Promise<Page> {
  const owner = await (await browser.newContext({ storageState: OWNER_STATE })).newPage()
  const drawer = await openRequest(owner, date, code)
  await drawer.getByRole('button', { name: 'Confirm', exact: true }).click()
  await expect(owner.getByText('Booking confirmed · the client is notified')).toBeVisible()
  return owner
}

/** What the client chose: the day and the time's text («10:30»), and the confirm step's address, which carries it all. */
export interface Chosen {
  date: string
  time: string
  url: string
}

/**
 * The client picks two services on the salon's page, a specialist (anyone, or the first named one) and the first free
 * time, then signs in on the confirm step.
 */
export async function chooseAndSignIn(page: Page, phone: string, opts: { staff?: 'any' | 'first' } = {}): Promise<Chosen> {
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

  if (opts.staff === 'first')
    await page
      .getByRole('radio', { name: /^(?!Any specialist)/ })
      .first()
      .check()
  else await page.getByRole('radio', { name: 'Any specialist' }).check()
  await page.getByRole('button', { name: 'Continue' }).click()

  const time = await pickFirstFreeTime(page)
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.getByRole('button', { name: 'Confirm your number' }).click()
  await signInWithCode(page.getByRole('dialog'), phone, clientName(phone))
  await expect(page.getByRole('img', { name: 'Number confirmed' })).toBeVisible()
  const url = page.url()
  const date = new URL(url).searchParams.get('date')
  expect(date, 'the booking page carries the chosen day').toMatch(/^\d{4}-\d{2}-\d{2}$/)
  return { date: date!, time, url }
}

/** The first free time on the time step (a day with none sends to the next free day); its text («10:30»). */
export async function pickFirstFreeTime(page: Page): Promise<string> {
  const slot = page.getByRole('button', { name: /^\d{1,2}:\d{2}$/ })
  const nextFree = page.getByRole('button', { name: /^Next free day/ })
  await expect(slot.first().or(nextFree)).toBeVisible()
  if (await nextFree.isVisible()) await nextFree.click()
  // read and click the same element: the list may re-render between two lookups (the push channel, a day's load)
  const first = slot.first()
  await expect(first).toBeVisible()
  const handle = await first.elementHandle()
  const time = (await handle.textContent())?.trim()
  await handle.click()
  return time!
}

/** «Send booking», then the sent page's booking code. */
export async function sendBooking(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Send booking' }).click()
  await expect(page.getByRole('heading', { name: 'Booking sent' })).toBeVisible()
  const code = (await page.getByText(/^Booking code:/).textContent())?.match(/YR-\d+/)?.[0]
  expect(code, 'the sent page shows the booking code').toBeTruthy()
  return code!
}

/** A new client's context (a phone's, with `viewport`), its booking sent and confirmed by the owner. */
export async function bookAndConfirm(
  browser: Browser,
  phone: string,
  context: BrowserContextOptions = {},
): Promise<{ client: Page; owner: Page; code: string; chosen: Chosen }> {
  const client = await (await browser.newContext(context)).newPage()
  const chosen = await chooseAndSignIn(client, phone)
  const code = await sendBooking(client)
  const owner = await confirmAsOwner(browser, chosen.date, code)
  return { client, owner, code, chosen }
}

/** The client's rows in My bookings (the salon's). */
export const bookingRow = (page: Page) =>
  page.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Glow Studio, .*: open the booking$/ }) })

/** My bookings, on its Upcoming tab. */
export async function openMyBookings(page: Page): Promise<void> {
  await page.goto(`${CLIENT_URL}/en/account/bookings`)
  await expect(page.getByRole('heading', { name: 'My bookings' })).toBeVisible()
}

/** The booking's drawer, opened from its address. */
export async function openBookingDrawer(page: Page, code: string): Promise<Locator> {
  await page.goto(`${CLIENT_URL}/en/account/bookings/${code}`)
  // the drawer is named after the business
  const drawer = page.getByRole('dialog', { name: SALON.name, exact: true })
  await expect(drawer).toBeVisible()
  return drawer
}

/**
 * Time passes for one booking (`POST /v1/e2e/bookings/{code}/elapse`, on with `E2E_HOOKS` in the stack and a
 * developer's api): a waiting request's hold runs out, a confirmed visit ends; the api's real jobs then expire or
 * complete it, as they would at that moment.
 */
export async function elapse(request: APIRequestContext, code: string): Promise<'cancelled' | 'completed'> {
  const res = await request.post(`${API_URL}/v1/e2e/bookings/${code}/elapse`)
  expect(res.ok(), `the e2e hook answers (${res.status()}): is E2E_HOOKS on in the api?`).toBe(true)
  return ((await res.json()) as { status: 'cancelled' | 'completed' }).status
}
