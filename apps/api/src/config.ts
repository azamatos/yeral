/** Environment for the api, read once from `process.env` (ADR 0024). */
import { resolve } from 'node:path'
import { parseEnv } from '@yeral/lib/env'
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
   * The key the Ýeral team's authenticator secrets are sealed under (ADR 0026): 32 random bytes, base64
   * (`openssl rand -base64 32`). Development and tests use a fixed one; production without it has no admin tool.
   */
  ADMIN_SECRET_KEY: z
    .base64()
    .refine((key) => atob(key).length === 32, '32 bytes')
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
  /** `ADMIN_SECRET_KEY`'s bytes; null in production until it's set (the admin tool answers `admin_unavailable`). */
  adminKey: Uint8Array<ArrayBuffer> | null
}

export function loadConfig(source: Record<string, unknown>): Config {
  const env = parseEnv(envSchema, source)
  const site = siteFromEnv(source)
  return {
    databaseUrl: env.DATABASE_URL,
    port: env.PORT ?? Number(new URL(site.urls.api).port || 3004),
    site,
    mediaBaseUrl: (env.MEDIA_BASE_URL ?? `${site.urls.api}/media`).replace(/\/$/, ''),
    mediaDir: resolve(env.MEDIA_DIR ?? 'data/media'),
    logLevel: env.LOG_LEVEL,
    trustedIpHeader: env.TRUSTED_IP_HEADER,
    codeOnScreen: env.SIGN_IN_CODE_ON_SCREEN === 'true',
    adminKey: env.ADMIN_SECRET_KEY
      ? Uint8Array.from(atob(env.ADMIN_SECRET_KEY), (ch) => ch.charCodeAt(0))
      : site.env === 'production'
        ? null
        : DEV_ADMIN_KEY,
  }
}
