import { expect, test } from '../src/test'
import { CLIENT_URL, SALON } from '../src/stack'

/**
 * Finding a place (P4 slice 5; book C-02, C-03, C-05, F-197): from Home to a category, a search to a booking at a time, and
 * what search engines read. A week's search, so the flow doesn't depend on the hour it runs. Location and the map stay in
 * stories: a browser's position and MapLibre's moves.
 */

test('Home leads to a category’s page, and an unknown category is the 404', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/en`)
  await expect(page.getByRole('heading', { level: 1, name: 'Take your place.' })).toBeVisible()
  const tile = page.locator('a[href^="/en/c/"]').last()
  const href = await tile.getAttribute('href')
  await tile.click()
  await expect(page).toHaveURL(`${CLIENT_URL}${href}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const missing = await page.goto(`${CLIENT_URL}/en/c/no-such-category`)
  expect(missing?.status()).toBe(404)
})

test('a search lists places with free times, and a time opens the booking at that time', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/en/search?day=week`)
  await expect(page.getByText(/places? · free time this week$/)).toBeVisible()
  const time = page.getByRole('link', { name: /^Book .* at \d{1,2}:\d{2}$/ }).first()
  await expect(time).toBeVisible()
  await time.click()
  await expect(page).toHaveURL(/\/en\/b\/[^/]+\/book\?.*time=\d+/)
})

test('a search for words no place has says so', async ({ page }) => {
  await page.goto(`${CLIENT_URL}/en/search?what=zzzzzz`)
  await expect(page.getByText('No places for “zzzzzz”')).toBeVisible()
})

test('search engines get a sitemap, robots and a business’s structured data', async ({ page, request }) => {
  const sitemap = await request.get(`${CLIENT_URL}/sitemap.xml`)
  expect(sitemap.ok()).toBe(true)
  expect(sitemap.headers()['content-type']).toContain('application/xml')
  const xml = await sitemap.text()
  expect(xml).toContain(`/en/b/${SALON.slug}<`)
  expect(xml).toContain('/en/search<')

  const robots = await request.get(`${CLIENT_URL}/robots.txt`)
  expect(await robots.text()).toContain('/sitemap.xml')

  // in the page the server sends, as a crawler reads it, and still there once the app has taken over
  const html = await (await request.get(`${CLIENT_URL}/en/b/${SALON.slug}`)).text()
  expect(html).toMatch(/<script[^>]*application\/ld\+json[^>]*>[^<]*LocalBusiness/)
  await page.goto(`${CLIENT_URL}/en/b/${SALON.slug}`)
  await expect(page.getByRole('heading', { level: 1, name: SALON.name })).toBeVisible()
  expect(await page.locator('script[type="application/ld+json"]').textContent()).toContain('LocalBusiness')
})
