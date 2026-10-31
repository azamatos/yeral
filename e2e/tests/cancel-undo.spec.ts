import { expect, test, type Locator } from '@playwright/test'
import { bookAndConfirm, bookingRow, chooseAndSignIn, confirmAsOwner, openBookingDrawer, openMyBookings, sendBooking } from '../src/booking'
import { signInWithCode } from '../src/sign-in'
import { clientName, freshPhone } from '../src/stack'

/**
 * A client's cancel and its Undo (book C-28, B-27, ROUND6 A6; log/2026-10-20-p2-undo-reasons.md): the booking's
 * drawer cancels a confirmed booking, the toast's Undo brings it back within 5 minutes; once someone else has taken
 * the time, Undo says so instead.
 */

/** The drawer's cancel: «Cancel the booking» → «Yes, cancel»; the drawer closes and the toast offers Undo. */
async function cancelInDrawer(drawer: Locator) {
  await drawer.getByRole('button', { name: 'Cancel the booking' }).click()
  const ask = drawer.page().getByRole('dialog', { name: 'Cancel the booking?' })
  await ask.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(drawer.page().getByText('The booking is cancelled')).toBeVisible()
}

test('the client cancels a confirmed booking and Undo brings it back', async ({ browser }) => {
  const phone = freshPhone()
  const { client, code } = await bookAndConfirm(browser, phone)
  await openMyBookings(client)
  await expect(bookingRow(client).first()).toContainText('Confirmed')

  const drawer = await openBookingDrawer(client, code)
  await expect(drawer).toContainText('Confirmed')
  await cancelInDrawer(drawer)
  await client.getByRole('button', { name: 'Undo' }).click()
  await expect(client.getByText('Your booking is back')).toBeVisible()

  const row = bookingRow(client).first()
  await expect(row).toContainText('Confirmed')
  await expect(row).not.toContainText('You cancelled')
})

test('Undo fails once another client has taken the time', async ({ browser }) => {
  const phone = freshPhone()
  const client = await (await browser.newContext()).newPage()
  // a named specialist, so the time is theirs alone: the second client asks for the same one
  const { date, url } = await chooseAndSignIn(client, phone, { staff: 'first' })
  const code = await sendBooking(client)
  await confirmAsOwner(browser, date, code)

  const drawer = await openBookingDrawer(client, code)
  await expect(drawer).toContainText('Confirmed')
  await cancelInDrawer(drawer)

  // another client books the same specialist at the same time (the confirm step's address carries the choice)
  const other = freshPhone()
  const second = await (await browser.newContext()).newPage()
  await second.goto(url)
  // rendered on the server: the first click retries until React has taken the page over
  await expect(async () => {
    await second.getByRole('button', { name: 'Confirm your number' }).click()
    await expect(second.getByRole('dialog')).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await signInWithCode(second.getByRole('dialog'), other, clientName(other))
  await sendBooking(second)

  // the drawer's own Undo (the toast's is gone by now): refused, with the reason
  const again = await openBookingDrawer(client, code)
  await expect(again).toContainText('You cancelled')
  await again.getByRole('button', { name: 'Undo' }).click()
  await expect(again.getByText("Couldn't undo — this time was already given to another client.")).toBeVisible()
  await expect(again.getByRole('button', { name: 'Undo' })).toBeHidden()
})
