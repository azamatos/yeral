/**
 * Hosts, cookie domain and environment for every app and the api (AGENTS.md rule 6, operations.md "Environments").
 * The name and domain are working titles, so nothing outside this file knows `yeral.app`: a new domain is a config change.
 */
import { z } from 'zod'
import { EnvError, parseEnv } from './env'

/** Local work and production only (ADR 0020): no staging. */
export const SITE_ENVS = ['local', 'docker', 'production'] as const
export type SiteEnv = (typeof SITE_ENVS)[number]

export const SITE_APPS = ['client', 'business', 'cms', 'api', 'storybook'] as const
export type SiteApp = (typeof SITE_APPS)[number]

export interface SiteConfig {
  env: SiteEnv
  /** Origin of each site, no trailing slash. */
  urls: Record<SiteApp, string>
  /** `Domain` of the shared session cookie (client + business); undefined = host-only (localhost). */
  cookieDomain: string | undefined
  /** Cookie name prefix per environment, so sessions from different environments never mix. */
  cookiePrefix: string
  /** Web origins allowed to call the api with credentials. */
  origins: string[]
  /** Demo behaviour (SMS code 1234, demo businesses that answer by themselves) is on everywhere but production. */
  demo: boolean
}

/** Local dev ports are PORT_BASE + offset (techContext "Local development"). */
export const PORT_OFFSETS: Record<SiteApp, number> = {
  // the client site takes +0 when it replaces apps/legacy (end of M3); until then legacy has +0
  client: 1,
  business: 2,
  cms: 3,
  api: 4,
  storybook: 5,
}

export interface SiteOptions {
  env: SiteEnv
  /** Registered domain: `yeral.app` today. */
  domain?: string
  /** First local port: 3000, or 3100, 3200… in a parallel worktree. */
  portBase?: number
}

export function siteConfig({ env, domain = 'yeral.app', portBase = 3000 }: SiteOptions): SiteConfig {
  let urls: Record<SiteApp, string>
  let cookieDomain: string | undefined = domain
  let cookiePrefix = 'yeral'
  switch (env) {
    case 'production':
      urls = {
        client: `https://${domain}`,
        business: `https://business.${domain}`,
        cms: `https://cms.${domain}`,
        api: `https://api.${domain}`,
        storybook: `https://storybook.${domain}`,
      }
      break
    case 'docker': {
      // the production-like stack behind Caddy: *.localhost resolves to this machine without /etc/hosts
      const base = domain.replace(/\.[^.]+$/, '.localhost')
      urls = {
        client: `http://${base}`,
        business: `http://business.${base}`,
        cms: `http://cms.${base}`,
        api: `http://api.${base}`,
        storybook: `http://storybook.${base}`,
      }
      cookieDomain = base
      cookiePrefix = 'yeral-docker'
      break
    }
    case 'local':
      urls = Object.fromEntries(SITE_APPS.map((app) => [app, `http://localhost:${portBase + PORT_OFFSETS[app]}`])) as Record<
        SiteApp,
        string
      >
      // localhost cookies are shared across ports, so one login works in every app
      cookieDomain = undefined
      cookiePrefix = 'yeral-local'
      break
  }
  return {
    env,
    urls,
    cookieDomain,
    cookiePrefix,
    origins: [urls.client, urls.business, urls.cms],
    demo: env !== 'production',
  }
}

const siteEnvSchema = z.object({
  YERAL_ENV: z.enum(SITE_ENVS).default('local'),
  YERAL_DOMAIN: z
    .string()
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/)
    .default('yeral.app'),
  PORT_BASE: z.coerce.number().int().min(1024).max(65000).default(3000),
})

/**
 * Site config from environment variables: `YERAL_ENV`, `YERAL_DOMAIN`, `PORT_BASE`. Vite apps pass `import.meta.env`
 * with prefix `VITE_` (`VITE_YERAL_ENV` …); the api passes `process.env` or the Worker's env.
 */
export function siteFromEnv(source: Record<string, unknown>, prefix = ''): SiteConfig {
  // an empty variable (`VITE_YERAL_DOMAIN=`) counts as unset, so the default applies
  const value = (name: string) => (source[name] === '' ? undefined : source[name])
  // the variable each setting is read from: PORT_BASE is shared by every app, a prefixed one wins when it's set
  const nameOf = (key: string) => (key === 'PORT_BASE' && value(prefix + key) === undefined ? key : prefix + key)
  const keys = Object.keys(siteEnvSchema.shape)
  if (value(nameOf('YERAL_ENV')) === 'staging') throw new EnvError([nameOf('YERAL_ENV')], 'there is no staging any more, ADR 0020')
  let env: z.output<typeof siteEnvSchema>
  try {
    env = parseEnv(siteEnvSchema, Object.fromEntries(keys.map((key) => [key, value(nameOf(key))])))
  } catch (e) {
    // name the variables as they're spelled in the environment (`VITE_YERAL_ENV`), like every other env error
    if (e instanceof EnvError) throw new EnvError(e.variables.map(nameOf))
    throw e
  }
  return siteConfig({ env: env.YERAL_ENV, domain: env.YERAL_DOMAIN, portBase: env.PORT_BASE })
}
