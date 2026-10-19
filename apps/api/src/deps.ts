/** What every request handler gets: database, site config, clock, SMS, media URLs, logger. */
import type { SiteConfig } from '@yeral/lib/site'
import type { Config } from './config'
import type { Db } from './db/client'
import type { TrustedIpHeader } from './lib/rate-limit'
import { createLogger, type Logger } from './ports/log'
import { logSms, type SmsPort } from './ports/sms'

export interface Deps {
  db: Db
  site: SiteConfig
  /** Epoch ms; tests pass a fixed clock. */
  now: () => number
  sms: SmsPort
  /** Media key → public URL. */
  media: (key: string) => string
  log: Logger
  /** Where the caller's IP comes from (`TRUSTED_IP_HEADER`); unset = no header is trusted. */
  trustedIpHeader?: TrustedIpHeader
}

/** The dependencies as the Node entry builds them (ADR 0024). */
export function createDeps(config: Config, db: Db, log: Logger = createLogger(config.logLevel, { app: 'api' })): Deps {
  return {
    db,
    site: config.site,
    now: Date.now,
    sms: logSms(log),
    media: (key) => `${config.mediaBaseUrl}/${key}`,
    log,
    trustedIpHeader: config.trustedIpHeader,
  }
}
