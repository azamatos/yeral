import { siteConfig } from '@yeral/lib/site'
import { createApp } from '../src/app'
import type { Db } from '../src/db/client'
import type { Deps } from '../src/deps'
import { nullLogger } from '../src/ports/log'
import { memorySms } from '../src/ports/sms'

/** Demo clock: Wednesday 2026-10-14, 11:20 at the business. */
export const DEMO_NOW = Date.parse('2026-10-14T06:20:00Z')

export const site = siteConfig({ env: 'local', portBase: 3000 })
export const ORIGIN = site.urls.client

/** The app as the entries build it, with a settable clock and captured SMS. */
export function testApp(db: Db, opts: { now?: number; trustedIpHeader?: Deps['trustedIpHeader']; smsDelivers?: boolean } = {}) {
  const clock = { now: opts.now ?? DEMO_NOW }
  const sms = memorySms({ delivers: opts.smsDelivers })
  const deps: Deps = {
    db,
    site,
    now: () => clock.now,
    sms,
    media: (key) => `http://media.test/${key}`,
    log: nullLogger,
    trustedIpHeader: opts.trustedIpHeader,
  }
  const app = createApp(async (c, next) => {
    c.set('deps', deps)
    await next()
  })
  return { app, clock, sms, deps }
}
