import { expect, test } from '@playwright/test'
import { bookAndConfirm, bookingRow, elapse, openMyBookings } from '../src/booking'
import { CLIENT_URL, freshPhone, SALON } from '../src/stack'

/**
 * «How was it?» and the review (book F-243, C-34, C-35; log/2026-10-30-how-was-it-card.md): a completed visit asks on
 * My bookings, a star opens the form, the sent review marks the row «You rated» and shows on the salon's page. The
 * visit's end can't be waited for: the api's e2e hook lets the booking's time pass (`elapse`); completing it is the
 * real job's work.
 */
test('a completed visit asks «How was it?», the review marks the row and shows on the business’s page', async ({ browser, request }) => {
  const phone = freshPhone()
  const { client, code } = await bookAndConfirm(browser, phone)
  expect(await elapse(request, code)).toBe('completed')

  await openMyBookings(client)
  const card = client.getByRole('region', { name: 'How was it?' })
  await expect(card).toBeVisible()
  await expect(card).toContainText(SALON.name)
  await card.getByRole('radio', { name: '5 stars' }).click()

  const form = client.getByRole('dialog', { name: 'How was it?' })
  await expect(form).toBeVisible()
  const words = `Lovely, on time and friendly (test ${phone.slice(-4)})`
  await form.getByRole('textbox', { name: /^Your review/ }).fill(words)
  await form.getByRole('button', { name: 'Send review' }).click()
  await expect(client.getByText('Thank you! Your review is published.')).toBeVisible()
  await expect(card).toBeHidden()

  await client.getByRole('tab', { name: 'Past' }).click()
  const row = bookingRow(client).filter({ hasText: 'You rated' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByRole('img', { name: 'You rated it 5 out of 5' })).toBeVisible()

  await client.goto(`${CLIENT_URL}/en/b/${SALON.slug}`)
  await expect(client.getByRole('region', { name: 'Reviews' }).getByText(words)).toBeVisible()
})
