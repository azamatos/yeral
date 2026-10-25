/** What every request handler gets: database, site config, clock, SMS, media URLs, logger. */
import type { BookingType } from '@yeral/domain/model'
import type { SiteConfig } from '@yeral/lib/site'
import type { Config } from './config'
import type { Db } from './db/client'
import type { TrustedIpHeader } from './lib/rate-limit'
import { createLive, type Live } from './modules/events/live'
import { build } from './version'
import { noGeocoder, photonGeocoder, type GeocoderPort } from './ports/geocoder'
import { createLogger, type Logger } from './ports/log'
import { logSms, type SmsPort } from './ports/sms'
import { diskStorage, type StoragePort } from './ports/storage'

export interface Deps {
  db: Db
  site: SiteConfig
  /** Epoch ms; tests pass a fixed clock. */
  now: () => number
  sms: SmsPort
  /** Media key → public URL. */
  media: (key: string) => string
  /** The photos people upload (`/media/up/…`). */
  storage: StoragePort
  log: Logger
  /** Where the caller's IP comes from (`TRUSTED_IP_HEADER`); unset = no header is trusted. */
  trustedIpHeader?: TrustedIpHeader
  /**
   * The sign-in code on the screen (`SIGN_IN_CODE_ON_SCREEN`, the first launch; book Q-036, F-200). While it's on, a
   * phone number proves nothing, so nothing that needs the number to be the person's runs: a phone change, letting an
   * unused account go ("Is this you?").
   */
  codeOnScreen: boolean
  /** The kinds of booking open now (book Q-030): the others stay out of lists and search. */
  bookingTypes: readonly BookingType[]
  /** The key the Ýeral team's authenticator secrets are sealed under (ADR 0026); null: no admin tool here. */
  adminKey: Uint8Array<ArrayBuffer> | null
  /** The business app's demo workspace (`DEMO_WORKSPACE`, book F-242): kept by the jobs, made again every night. */
  demoWorkspace: boolean
  /** The address search behind the map pin (ADR 0027). */
  geocoder: GeocoderPort
  /** The open event streams and their nudges (`modules/events/live.ts`); the Node entry LISTENs into it. */
  live: Live
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
    storage: diskStorage(config.mediaDir),
    log,
    trustedIpHeader: config.trustedIpHeader,
    codeOnScreen: config.codeOnScreen,
    adminKey: config.adminKey,
    bookingTypes: config.bookingTypes,
    demoWorkspace: config.demoWorkspace,
    // named, as the public Photon asks of every app: the site's own address (from config), the api's version
    geocoder: config.geocoderUrl
      ? photonGeocoder(config.geocoderUrl, `${new URL(config.site.urls.client).host}/${build.version} (+${config.site.urls.client})`)
      : noGeocoder,
    live: createLive(db),
  }
}
