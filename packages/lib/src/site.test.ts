import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { EnvError, parseEnv } from './env'
import { siteConfig, siteFromEnv } from './site'

describe('siteConfig', () => {
  it('production: the marketplace on the apex, the rest on subdomains', () => {
    const site = siteConfig({ env: 'production' })
    expect(site.urls).toEqual({
      client: 'https://yeral.app',
      business: 'https://business.yeral.app',
      cms: 'https://cms.yeral.app',
      api: 'https://api.yeral.app',
      storybook: 'https://storybook.yeral.app',
    })
    expect(site.cookieDomain).toBe('yeral.app')
    expect(site.demo).toBe(false)
  })

  it('a new domain is a config change', () => {
    expect(siteConfig({ env: 'production', domain: 'yeral.com' }).urls.business).toBe('https://business.yeral.com')
  })

  it('local: ports from PORT_BASE, host-only cookies', () => {
    const site = siteConfig({ env: 'local', portBase: 3100 })
    expect(site.urls.api).toBe('http://localhost:3104')
    expect(site.urls.storybook).toBe('http://localhost:3105')
    expect(site.cookieDomain).toBeUndefined()
    expect(site.origins).toEqual(['http://localhost:3101', 'http://localhost:3102', 'http://localhost:3103'])
  })

  it('docker: *.localhost behind nginx', () => {
    const site = siteConfig({ env: 'docker' })
    expect(site.urls.client).toBe('http://yeral.localhost')
    expect(site.urls.api).toBe('http://api.yeral.localhost')
    expect(site.cookieDomain).toBe('yeral.localhost')
  })

  it('docker: replaces the last label whatever it is', () => {
    expect(siteConfig({ env: 'docker', domain: 'yeral.xn--p1ai' }).urls.client).toBe('http://yeral.localhost')
    expect(siteConfig({ env: 'docker', domain: 'yeral.app2' }).urls.api).toBe('http://api.yeral.localhost')
  })
})

describe('siteFromEnv', () => {
  it('reads plain and VITE_-prefixed variables, with defaults', () => {
    expect(siteFromEnv({}).env).toBe('local')
    expect(siteFromEnv({ YERAL_ENV: 'production' }).urls.client).toBe('https://yeral.app')
    expect(siteFromEnv({ VITE_YERAL_ENV: 'production', VITE_YERAL_DOMAIN: 'yeral.com' }, 'VITE_').urls.client).toBe('https://yeral.com')
    expect(siteFromEnv({ PORT_BASE: '3200' }).urls.api).toBe('http://localhost:3204')
  })

  it('rejects an unknown environment', () => {
    expect(() => siteFromEnv({ YERAL_ENV: 'prod' })).toThrow()
    // there is no staging (ADR 0020)
    expect(() => siteFromEnv({ YERAL_ENV: 'staging' })).toThrow(/no staging any more/)
  })

  it('treats an empty variable as unset', () => {
    expect(siteFromEnv({ VITE_YERAL_ENV: '', VITE_YERAL_DOMAIN: '', VITE_PORT_BASE: '' }, 'VITE_').urls.api).toBe('http://localhost:3004')
    expect(siteFromEnv({ PORT_BASE: '', YERAL_DOMAIN: '' }).urls.api).toBe('http://localhost:3004')
    expect(siteFromEnv({ VITE_PORT_BASE: '', PORT_BASE: '3200' }, 'VITE_').urls.api).toBe('http://localhost:3204')
  })

  it('names the bad variables as they are spelled in the environment', () => {
    try {
      siteFromEnv({ VITE_YERAL_ENV: 'prod', VITE_YERAL_DOMAIN: 'not a domain', PORT_BASE: '80' }, 'VITE_')
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError)
      expect((e as EnvError).variables).toEqual(['VITE_YERAL_ENV', 'VITE_YERAL_DOMAIN', 'PORT_BASE'])
    }
  })
})

describe('parseEnv', () => {
  const schema = z.object({ DATABASE_URL: z.url(), SECRET: z.string().min(32) })

  it('returns the parsed values', () => {
    expect(parseEnv(schema, { DATABASE_URL: 'postgres://x@localhost/db', SECRET: 'x'.repeat(32) }).SECRET).toHaveLength(32)
  })

  it('names the bad variables without their values', () => {
    try {
      parseEnv(schema, { DATABASE_URL: 'not a url', SECRET: 'short-secret-value' })
      expect.unreachable()
    } catch (e) {
      expect(e).toBeInstanceOf(EnvError)
      expect((e as EnvError).variables).toEqual(['DATABASE_URL', 'SECRET'])
      expect((e as Error).message).not.toContain('short-secret-value')
    }
  })
})
