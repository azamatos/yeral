/** What every request handler gets: database, site config, clock, SMS, media URLs, logger. */
import type { SiteConfig } from '@yeral/lib/site'
import type { Db } from './db/client'
import type { Logger } from './ports/log'
import type { SmsPort } from './ports/sms'

export interface Deps {
  db: Db
  site: SiteConfig
  /** Epoch ms; tests pass a fixed clock. */
  now: () => number
  sms: SmsPort
  /** Media key → public URL. */
  media: (key: string) => string
  log: Logger
}
