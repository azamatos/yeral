import { expect, test } from '@playwright/test'
import { BUSINESS_URL } from '../src/stack'

/**
 * The business app installs (book F-096, slice 4's B13): the manifest and the worker are served at the root and never
 * held by a cache, or a deploy couldn't reach an installed app.
 */
test('the business app serves its manifest and worker uncached', async ({ request }) => {
  const manifest = await request.get(`${BUSINESS_URL}/manifest.webmanifest`)
  expect(manifest.status()).toBe(200)
  expect(manifest.headers()['cache-control']).toContain('no-cache')
  expect(await manifest.json()).toMatchObject({ display: 'standalone', start_url: '/' })

  const worker = await request.get(`${BUSINESS_URL}/sw.js`)
  expect(worker.status()).toBe(200)
  expect(worker.headers()['cache-control']).toContain('no-cache')
})
