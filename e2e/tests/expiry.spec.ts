import { expect, test } from '@playwright/test'
import { bookingRow, chooseAndSignIn, elapse, openMyBookings, sendBooking } from '../src/booking'
import { freshPhone } from '../src/stack'

/**
 * A request the business doesn't answer runs out at its hold time (book B-20, C-25): the api's jobs cancel it and
 * offer the client 3 free times, which My bookings shows without a reload (ADR 0028). The hold is 30 minutes
 * (`holdMinutes`), so the test lets the booking's time pass with the api's e2e hook (`elapse`); the expiry itself is
 * the real job's work.
 */
test('a request nobody answers expires at its hold time and the client is offered 3 times', async ({ browser, request }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  await chooseAndSignIn(client, phone)
  const code = await sendBooking(client)
  await openMyBookings(client)
  const row = bookingRow(client).first()
  await expect(row).toContainText('Pending')

  expect(await elapse(request, code)).toBe('cancelled')

  await expect(row).toContainText('No answer in time')
  await expect(row).toContainText("Glow Studio didn't answer in time. Choose one of these free times:")
  await expect(row.getByRole('group', { name: 'Free times' }).getByRole('button', { name: /^Book / })).toHaveCount(3)
})
