import type { Locator, Page } from '@playwright/test'
import { expect, test } from '../src/test'
import { bookAndConfirm, bookingRow, chooseAndSignIn, elapse, openBookingDrawer, openMyBookings, openOwnerCalendar } from '../src/booking'
import { BUSINESS_URL, clientName, freshPhone, OWNER_STATE, SALON } from '../src/stack'

/**
 * The team's working day (P4 slice 4, log/2026-10-31-slice-4-plan.md → "Done when"; book B-23, B-26, B-27, B-28, B-30,
 * B-33, B-18): what the owner does in the business app, and what a client's My bookings then shows. The week view, the
 * browser notification and the install stay in stories and click tests.
 */

const WORKSPACE = `${BUSINESS_URL}/w/${SALON.slug}`

/** Three free hours after a start hold anything the flows book, whatever else that day has. */
const ROOM_SLOTS = 12
const SLOT_MIN = 15

const dayAfter = (date: string, days: number) => new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10)
const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours! * 60 + minutes!
}

/** The booking's drawer on the calendar, opened from the address. */
async function openDrawer(owner: Page, date: string, code: string): Promise<Locator> {
  await owner.goto(`${WORKSPACE}/calendar?date=${date}&booking=${code}`)
  const drawer = owner.getByRole('dialog', { name: 'Booking' })
  await expect(drawer).toBeVisible()
  return drawer
}

/** The column the client's booking sits in, on the calendar's day. */
async function columnOf(owner: Page, date: string, time: string, phone: string): Promise<Locator> {
  await owner.goto(`${WORKSPACE}/calendar?date=${date}`)
  const block = owner.getByRole('button', { name: new RegExp(`^${time} ${clientName(phone)}`) }).first()
  await expect(block).toBeVisible()
  return owner.getByRole('group').filter({ has: block })
}

/** Move mode on the first day after `after` with room in the person's column (a day off has none), and that start. */
async function moveTarget(owner: Page, code: string, after: string, staff: string): Promise<{ target: Locator; time: string }> {
  for (let days = 1; days <= 7; days++) {
    await owner.goto(`${WORKSPACE}/calendar?date=${dayAfter(after, days)}&move=${code}`)
    const targets = owner.getByRole('group', { name: staff, exact: true }).getByRole('button', { name: /— move here$/ })
    await targets
      .first()
      .waitFor({ timeout: 5_000 })
      .catch(() => undefined)
    const times = await targets.evaluateAll((slots) =>
      slots.map((s) => s.getAttribute('aria-label')?.match(/(\d{1,2}:\d{2}) —/)?.[1] ?? ''),
    )
    const at = times.findIndex(
      (time, i) => times[i + ROOM_SLOTS - 1] && minutesOf(times[i + ROOM_SLOTS - 1]!) === minutesOf(time) + (ROOM_SLOTS - 1) * SLOT_MIN,
    )
    if (at >= 0) return { target: targets.nth(at), time: times[at]! }
  }
  throw new Error(`no day with room for ${staff} in the week after ${after}`)
}

test('the owner books a client by phone from the calendar and the client’s My bookings shows it Confirmed', async ({ browser }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  // the client has an account by this number, and no booking yet
  await chooseAndSignIn(client, phone)

  const owner = await openOwnerCalendar(browser)
  await owner.getByRole('button', { name: 'New booking', exact: true }).click()
  const drawer = owner.getByRole('dialog', { name: 'New booking' })
  await drawer.getByRole('textbox', { name: 'Phone number' }).fill(phone)
  await expect(drawer.getByText(/^This number isn’t saved yet/)).toBeVisible()
  await drawer.getByRole('checkbox').first().check()
  await drawer
    .getByRole('button', { name: /\d{1,2}:\d{2}\s*·/ })
    .first()
    .click()
  await drawer.getByRole('button', { name: 'Save booking' }).click()
  await expect(owner.getByText('Booking saved · the client is notified')).toBeVisible()

  await openMyBookings(client)
  await expect(bookingRow(client).first()).toContainText('Confirmed')
})

test('the owner finds a booking by its code and moves it, and the client sees the new time', async ({ browser }) => {
  const phone = freshPhone()
  const { client, owner, code, chosen } = await bookAndConfirm(browser, phone)
  await openMyBookings(client)
  const row = bookingRow(client).first()
  await expect(row).toContainText(chosen.time)

  await owner.goto(`${WORKSPACE}/bookings?tab=today`)
  await owner.getByRole('textbox', { name: 'Client, phone or booking code' }).fill(code)
  const found = owner.getByRole('button', { name: clientName(phone), exact: true })
  // the tab follows the day the booking fell on
  await expect(found.or(owner.getByText('Nothing found'))).toBeVisible()
  if (!(await found.isVisible())) await owner.getByRole('tab', { name: 'Upcoming' }).click()
  await found.click()
  await expect(owner.getByRole('dialog', { name: 'Booking' })).toBeVisible()

  const column = await columnOf(owner, chosen.date, chosen.time, phone)
  const staff = (await column.getAttribute('aria-label'))!
  const { target, time } = await moveTarget(owner, code, chosen.date, staff)
  await target.click()
  await owner.getByRole('dialog', { name: / → / }).getByRole('button', { name: 'Confirm' }).click()
  await expect(owner.getByText(/^Booking moved: .* · the client is notified$/)).toBeVisible()

  await expect(row).toContainText(time)
  await expect(row).toContainText('Confirmed')
})

test('the owner cancels a booking with a reason and the client reads it', async ({ browser }) => {
  const { client, owner, code, chosen } = await bookAndConfirm(browser, freshPhone())
  const drawer = await openDrawer(owner, chosen.date, code)
  await drawer.getByRole('button', { name: 'Cancel booking' }).click()
  const ask = owner.getByRole('dialog', { name: 'Cancel the booking' })
  await ask.getByRole('radio', { name: 'The specialist can’t come in' }).check()
  await ask.getByRole('button', { name: 'Cancel booking' }).click()
  await expect(owner.getByText('Booking cancelled · the client is notified')).toBeVisible()

  const mine = await openBookingDrawer(client, code)
  await expect(mine).toContainText('The business cancelled')
  await expect(mine).toContainText(/Reason: The specialist can.t come in/)
})

test('a no-show reported after the visit shows on the client’s row', async ({ browser, request }) => {
  const { client, owner, code, chosen } = await bookAndConfirm(browser, freshPhone())
  expect(await elapse(request, code)).toBe('completed')

  const drawer = await openDrawer(owner, chosen.date, code)
  await drawer.getByRole('button', { name: 'Report' }).click()
  await owner.getByRole('menuitem', { name: /No-show/ }).click()
  await expect(drawer.getByText(/^No-show · /)).toBeVisible()

  await openMyBookings(client)
  await client.getByRole('tab', { name: 'Past' }).click()
  await expect(bookingRow(client).first()).toContainText('Marked as a no-show')
})

test('a block over a booking is refused, and leads to the booking', async ({ browser }) => {
  const phone = freshPhone()
  const { owner, chosen } = await bookAndConfirm(browser, phone)
  const column = await columnOf(owner, chosen.date, chosen.time, phone)
  await column
    .getByRole('button', { name: /— new booking or block time$/ })
    .first()
    .click()
  await owner.getByRole('menuitem', { name: 'Block time' }).click()
  const block = owner.getByRole('dialog', { name: 'Block time' })
  await block.getByRole('combobox', { name: 'From' }).selectOption({ label: chosen.time })
  const to = block.getByRole('combobox', { name: 'To' })
  await to.selectOption({ index: (await to.getByRole('option').count()) - 1 })
  await block.getByRole('radio', { name: 'Personal' }).check()
  await block.getByRole('button', { name: 'Block time' }).click()

  const refused = block.getByRole('alert')
  await expect(refused).toContainText('This time has a booking')
  await refused.getByRole('button', { name: 'Open the booking' }).click()
  await expect(owner.getByRole('dialog', { name: 'Booking' })).toBeVisible()
})

test('the owner adds a client by phone, finds them in the list, opens the card and deletes them', async ({ browser }) => {
  const phone = freshPhone()
  const name = clientName(phone)
  const owner = await (await browser.newContext({ storageState: OWNER_STATE })).newPage()
  await owner.goto(`${WORKSPACE}/clients?modal=add`)
  const add = owner.getByRole('dialog', { name: 'New client' })
  await add.getByRole('textbox', { name: 'Phone number' }).fill(phone)
  await add.getByRole('textbox', { name: 'Name' }).fill(name)
  await add.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(owner.getByText('Client added')).toBeVisible()

  await owner.getByRole('textbox', { name: 'Name or phone number' }).fill(name)
  await owner.getByRole('link', { name, exact: true }).click()
  await expect(owner.getByRole('heading', { level: 2, name })).toBeVisible()
  await expect(owner.getByText('No upcoming bookings.')).toBeVisible()

  await owner.getByRole('button', { name: 'Delete client' }).click()
  const ask = owner.getByRole('dialog', { name: 'Delete this client?' })
  await ask.getByRole('button', { name: 'Delete client' }).click()
  await expect(owner.getByText('Client deleted')).toBeVisible()
  await expect(owner).toHaveURL(`${WORKSPACE}/clients`)
})
