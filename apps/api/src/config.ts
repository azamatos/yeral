/** Environment for the api, read once from `process.env` (ADR 0024). */
import { resolve } from 'node:path'
import { BOOKING_TYPES, type BookingType } from '@yeral/domain/model'
import { EnvError, parseEnv } from '@yeral/lib/env'
import { siteFromEnv, type SiteConfig } from '@yeral/lib/site'
import { z } from 'zod'
import type { TrustedIpHeader } from './lib/rate-limit'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Node only: where to listen; defaults to the site's api port. */
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  /** Where photos are served from; defaults to `<api>/media`. */
  MEDIA_BASE_URL: z.url().optional(),
  /** Where uploaded photos are kept on disk (book F-101); defaults to `data/media` under the working directory. */
  MEDIA_DIR: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  /** The header our edge sets with the caller's IP: `x-forwarded-for` (behind Caddy, which writes it). */
  TRUSTED_IP_HEADER: z.enum(['x-forwarded-for']).optional(),
  /**
   * The first launch's sign-in (book Q-036, F-200): the code comes back for the screen, as no SMS reaches a phone. Off
   * unless set; refused with an SMS gateway that delivers.
   */
  SIGN_IN_CODE_ON_SCREEN: z.enum(['true', 'false']).default('false'),
  /**
   * The kinds of booking open now (book Q-030): appointments at the first launch; a business or category of another
   * kind stays out of every list and search. Comma-separated (`appointment,table,class`).
   */
  BOOKING_TYPES: z
    .string()
    .default('appointment')
    .transform((list) => list.split(',').map((t) => t.trim()))
    .pipe(z.array(z.enum(BOOKING_TYPES)).min(1)),
  /**
   * The first launch's example businesses (book Q-004, F-200): `setup` adds the design's appointment businesses that
   * aren't there yet, marked "Example", confirming at once, with no team. Off unless set.
   */
  EXAMPLE_BUSINESSES: z.enum(['true', 'false']).default('false'),
  /**
   * The phone every example business shows and "Call" reaches: never the design's invented numbers, which may be real
   * people's. Without it, Ýeral's support phone (`YERAL_SUPPORT_PHONE`, `site.support.phone`); the examples need one
   * of the two.
   */
  EXAMPLE_PHONE: z
    .string()
    .regex(/^\+\d{8,15}$/, 'E.164, such as +99312345678')
    .optional(),
  /**
   * The business app's demo workspace (book F-242): the jobs make it when it's missing and again every night at 04:00.
   * Off unless set.
   */
  DEMO_WORKSPACE: z.enum(['true', 'false']).default('false'),
  /**
   * The geocoder behind the address search (ADR 0027): a Photon server's address (http or https, its `api` under it), the
   * public one by default (fair use, no guarantee); `off` turns the search off (the pin is placed by hand).
   */
  GEOCODER_URL: z.union([z.literal('off'), z.url({ protocol: /^https?$/ })]).default('https://photon.komoot.io'),
  /**
   * The key the Ýeral team's authenticator secrets are sealed under (ADR 0026): 32 random bytes, base64
   * (`openssl rand -base64 32`). Development and tests use a fixed one; production without it has no admin tool.
   */
  ADMIN_SECRET_KEY: z
    .string()
    .refine((key) => {
      try {
        return /^[A-Za-z0-9+/]+={0,2}$/.test(key) && atob(key).length === 32
      } catch {
        return false
      }
    }, '32 bytes, base64')
    .optional(),
})

/** Outside production only: the admin tool works with no key set up. */
export const DEV_ADMIN_KEY = Uint8Array.from({ length: 32 }, (_, i) => i)

export interface Config {
  databaseUrl: string
  port: number
  site: SiteConfig
  mediaBaseUrl: string
  mediaDir: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  trustedIpHeader?: TrustedIpHeader
  codeOnScreen: boolean
  /** The kinds of booking open now (`BOOKING_TYPES`, book Q-030). */
  bookingTypes: BookingType[]
  /** `EXAMPLE_BUSINESSES`: `setup` adds the first launch's example businesses, showing `examplePhone`. */
  exampleBusinesses: boolean
  /** `EXAMPLE_PHONE`, or the support phone; never null while `exampleBusinesses` is on. */
  examplePhone: string | null
  /** `DEMO_WORKSPACE`: the business app's demo workspace (book F-242). */
  demoWorkspace: boolean
  /** `GEOCODER_URL`: the address search's Photon server; null when it's off (ADR 0027). */
  geocoderUrl: string | null
  /** `ADMIN_SECRET_KEY`'s bytes; null in production until it's set (the admin tool answers `admin_unavailable`). */
  adminKey: Uint8Array<ArrayBuffer> | null
}

export function loadConfig(source: Record<string, unknown>): Config {
  const env = parseEnv(envSchema, source)
  const site = siteFromEnv(source)
  const examplePhone = env.EXAMPLE_PHONE ?? site.support.phone ?? null
  if (env.EXAMPLE_BUSINESSES === 'true' && !examplePhone)
    throw new EnvError(['EXAMPLE_PHONE', 'YERAL_SUPPORT_PHONE'], 'the example businesses need a phone to show: one of the two')
  return {
    databaseUrl: env.DATABASE_URL,
    port: env.PORT ?? Number(new URL(site.urls.api).port || 3004),
    site,
    mediaBaseUrl: (env.MEDIA_BASE_URL ?? `${site.urls.api}/media`).replace(/\/$/, ''),
    mediaDir: resolve(env.MEDIA_DIR ?? 'data/media'),
    logLevel: env.LOG_LEVEL,
    trustedIpHeader: env.TRUSTED_IP_HEADER,
    codeOnScreen: env.SIGN_IN_CODE_ON_SCREEN === 'true',
    bookingTypes: env.BOOKING_TYPES,
    exampleBusinesses: env.EXAMPLE_BUSINESSES === 'true',
    examplePhone,
    demoWorkspace: env.DEMO_WORKSPACE === 'true',
    geocoderUrl: env.GEOCODER_URL === 'off' ? null : env.GEOCODER_URL,
    adminKey: env.ADMIN_SECRET_KEY
      ? Uint8Array.from(atob(env.ADMIN_SECRET_KEY), (ch) => ch.charCodeAt(0))
      : site.env === 'production'
        ? null
        : DEV_ADMIN_KEY,
  }
}
