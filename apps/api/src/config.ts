/** Environment for the api, read once: `process.env` on Node, the Worker's env on Cloudflare (ADR 0007). */
import { parseEnv } from '@yeral/lib/env'
import { siteFromEnv, type SiteConfig } from '@yeral/lib/site'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Node only: where to listen; defaults to the site's api port. */
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  /** Where photos are served from; defaults to `<api>/media`. */
  MEDIA_BASE_URL: z.url().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export interface Config {
  databaseUrl: string
  port: number
  site: SiteConfig
  mediaBaseUrl: string
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export function loadConfig(source: Record<string, unknown>): Config {
  const env = parseEnv(envSchema, source)
  const site = siteFromEnv(source)
  return {
    databaseUrl: env.DATABASE_URL,
    port: env.PORT ?? Number(new URL(site.urls.api).port || 3004),
    site,
    mediaBaseUrl: (env.MEDIA_BASE_URL ?? `${site.urls.api}/media`).replace(/\/$/, ''),
    logLevel: env.LOG_LEVEL,
  }
}
