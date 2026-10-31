import { expect, test } from '@playwright/test'
import { bookingRow, chooseAndSignIn, openMyBookings, openOwnerCalendar, openRequest, sendBooking } from '../src/booking'
import { clientName, freshPhone } from '../src/stack'

/**
 * The booking loop of P4 slice 3 (book C-06, C-12, B-19, B-20; log/2026-10-25-slice-3-plan.md «Done when»): a new
 * number books two services on the salon's page with the inline sign-in, the owner's calendar shows the request
 * through the push channel (ADR 0028), the owner answers, and the client's My bookings follows within seconds.
 * Two browser contexts, one per person (skill `testing`); the steps are in `src/booking.ts`.
 */

test('a new client books two services, the owner confirms, the client sees it confirmed', async ({ browser }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  const { date } = await chooseAndSignIn(client, phone)

  // the owner looks at the booked day before the request is sent: it must arrive without a reload (ADR 0028)
  const owner = await openOwnerCalendar(browser, date)
  const code = await sendBooking(client)

  await openMyBookings(client)
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
  const { date } = await chooseAndSignIn(client, phone)
  const code = await sendBooking(client)
  await openMyBookings(client)
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
