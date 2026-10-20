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
  /**
   * The sign-in code on the screen (`SIGN_IN_CODE_ON_SCREEN`, the first launch; book Q-036, F-200). While it's on, a
   * phone number proves nothing, so nothing that needs the number to be the person's runs: a phone change, letting an
   * unused account go ("Is this you?").
   */
  codeOnScreen: boolean
}

/** The dependencies as the Node entry builds them (ADR 0024). */
export function createDeps(config: Config, db: Db, log: Logger = createLogger(config.logLevel, { app: 'api' })): Deps {
  const sms = logSms(log)
  if (config.codeOnScreen && sms.delivers) throw new Error('SIGN_IN_CODE_ON_SCREEN is for a market whose SMS reach no phone')
  return {
    db,
    site: config.site,
    now: Date.now,
    sms,
    media: (key) => `${config.mediaBaseUrl}/${key}`,
    log,
    trustedIpHeader: config.trustedIpHeader,
    codeOnScreen: config.codeOnScreen,
  }
}
