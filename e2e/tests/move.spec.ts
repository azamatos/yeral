import { expect, test } from '@playwright/test'
import { bookAndConfirm, bookingRow, openBookingDrawer, openMyBookings, pickFirstFreeTime } from '../src/booking'
import { BUSINESS_URL, clientName, freshPhone, SALON } from '../src/stack'

/**
 * A client moves a confirmed appointment (book C-30, B-21; log/2026-10-25-client-move-mode.md, -move-request.md): move
 * mode asks a new time («Request the new time»), the owner's calendar shows the move's ghost block at the asked time,
 * its drawer confirms the new time, and the client's row shows it.
 */
test('the client asks to move a confirmed booking, the owner confirms the new time, the client sees it', async ({ browser }) => {
  const phone = freshPhone()
  const { client, owner, code, chosen } = await bookAndConfirm(browser, phone)

  const drawer = await openBookingDrawer(client, code)
  await drawer.getByRole('link', { name: 'Move to another time' }).click()
  await expect(client.getByRole('heading', { name: 'Change the time' })).toBeVisible()
  // the specialist as booked is chosen already; the new time is the first free one, never the previous («10:30, your previous time»)
  await client.getByRole('button', { name: 'Continue' }).click()
  const time = await pickFirstFreeTime(client)
  expect(time).not.toBe(chosen.time)
  await client.getByRole('button', { name: 'Continue' }).click()
  await expect(client.getByRole('heading', { name: 'Confirm the new time' })).toBeVisible()
  await client.getByRole('button', { name: 'Request the new time' }).click()
  await expect(client.getByRole('heading', { name: 'Move request sent' })).toBeVisible()
  const newDate = new URL(client.url()).searchParams.get('date')
  expect(newDate, 'the sent page carries the new day').toMatch(/^\d{4}-\d{2}-\d{2}$/)

  await openMyBookings(client)
  const row = bookingRow(client).first()
  await expect(row).toContainText('New time requested')

  // the owner's calendar on the asked day: the ghost at the asked time («New time?», the client's name under it) opens the move request
  await owner.goto(`${BUSINESS_URL}/w/${SALON.slug}/calendar?date=${newDate}`)
  await expect(owner.getByRole('region', { name: /^Calendar, / })).toBeVisible()
  const ghost = owner.getByRole('button', { name: /New time\?/ }).filter({ hasText: clientName(phone) })
  await expect(ghost).toBeVisible()
  await ghost.click()
  const request = owner.getByRole('dialog', { name: 'Time change request' })
  await expect(request).toBeVisible()
  await expect(request.getByText('Previous time')).toBeVisible()
  await expect(request.getByText(/ — you can confirm\.$/)).toBeVisible()
  await request.getByRole('button', { name: 'Confirm the new time' }).click()
  await expect(owner.getByText(/^New time confirmed: .* · the client is notified$/)).toBeVisible()

  // the client's row follows: confirmed at the new time
  await expect(row).not.toContainText('New time requested')
  await expect(row).toContainText('Confirmed')
  await expect(row).toContainText(time)
})
