import { siteConfig } from '@yeral/lib/site'
import { createApp } from '../src/app'
import type { Db } from '../src/db/client'
import type { Deps } from '../src/deps'
import { nullLogger } from '../src/ports/log'
import { memorySms } from '../src/ports/sms'
import { memoryStorage } from '../src/ports/storage'

/** Demo clock: Wednesday 2026-10-14, 11:20 at the business. */
export const DEMO_NOW = Date.parse('2026-10-14T06:20:00Z')

export const site = siteConfig({ env: 'local', portBase: 3000 })
export const ORIGIN = site.urls.client

/**
 * The app as the entries build it, with a settable clock and captured SMS. `demo: false` plays production (random
 * codes); `codeOnScreen` the first launch's sign-in; `smsDelivers` a gateway that reaches phones.
 */
export function testApp(
  db: Db,
  opts: { now?: number; trustedIpHeader?: Deps['trustedIpHeader']; demo?: boolean; codeOnScreen?: boolean; smsDelivers?: boolean } = {},
) {
  const clock = { now: opts.now ?? DEMO_NOW }
  const sms = memorySms({ delivers: opts.smsDelivers })
  const storage = memoryStorage()
  const deps: Deps = {
    db,
    site: opts.demo === false ? { ...site, demo: false } : site,
    now: () => clock.now,
    sms,
    media: (key) => `http://media.test/${key}`,
    storage,
    log: nullLogger,
    trustedIpHeader: opts.trustedIpHeader,
    codeOnScreen: opts.codeOnScreen ?? false,
  }
  const app = createApp(async (c, next) => {
    c.set('deps', deps)
    await next()
  })
  return { app, clock, sms, storage, deps }
}
