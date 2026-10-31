import { expect, test } from '@playwright/test'
import { bookAndConfirm, bookingRow, openMyBookings } from '../src/booking'
import { freshPhone } from '../src/stack'

/**
 * The booking loop on a phone (390 × 844, the design's phone width; slice 3's «Done when» asks for 1440 and 390): the
 * client's steps with their bottom action bar and the sign-in's bottom sheet, the owner confirming at a desk. The
 * Russian-length check («Text: +30 %») is Storybook's toolbar only (`stretched()` is off in the apps), so it stays
 * in the story tests.
 */
test('on a phone a new client books two services and sees the owner’s confirmation', async ({ browser }) => {
  const phone = freshPhone()
  const { client } = await bookAndConfirm(browser, phone, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await openMyBookings(client)
  const row = bookingRow(client).first()
  await expect(row).toContainText('Confirmed')
  // nothing wider than the phone: no sideways scroll on My bookings
  expect(await client.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
