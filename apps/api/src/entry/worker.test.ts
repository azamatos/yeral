import { isNull } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ORIGIN } from '../../test/app'
import { testDatabase } from '../../test/db'
import { urlFor } from '../../test/env'
import type { Db } from '../db/client'
import { jobs } from '../db/schema'
import { queueSms } from '../notify'
import worker from './worker'

/** Nothing listens on port 1: every connection attempt fails at once. */
const DOWN = 'postgres://yeral:yeral@127.0.0.1:1/yeral'

function context() {
  const pending: Promise<unknown>[] = []
  return {
    ctx: { waitUntil: (p: Promise<unknown>) => void pending.push(p), passThroughOnException: () => {}, props: {} },
    settled: () => Promise.all(pending),
  }
}

const envWith = (connectionString?: string) => ({
  YERAL_ENV: 'local',
  LOG_LEVEL: 'error',
  ...(connectionString ? { HYPERDRIVE: { connectionString } } : {}),
})

async function fetchWorker(path: string, env: Record<string, unknown>, init: RequestInit = {}) {
  const { ctx, settled } = context()
  const res = await worker.fetch(new Request(`http://api.test${path}`, init), env, ctx)
  await settled()
  return res
}

const logged = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.flat().join('\n')

describe('Workers entry', () => {
  // restored after each test (restoreMocks)
  let errors: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers /version.json and preflights without touching the database', async () => {
    const env = envWith(DOWN)
    expect((await fetchWorker('/version.json', env)).status).toBe(200)
    const preflight = await fetchWorker('/v1/categories', env, {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'GET' },
    })
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
  })

  it('turns a database outage into the JSON error body with CORS headers, and logs it', async () => {
    const res = await fetchWorker('/v1/categories', envWith(DOWN), { headers: { Origin: ORIGIN } })
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: { code: 'internal' } })
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(logged(errors)).toMatch(/"msg":"unhandled"/)
  })

  it('without the Hyperdrive binding (the top-level wrangler env) every request fails loudly', async () => {
    const res = await fetchWorker('/v1/categories', envWith())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: { code: 'internal' } })
    expect(logged(errors)).toMatch(/HYPERDRIVE binding is missing/)
  })

  it('the cron run logs a failure instead of rejecting', async () => {
    const { ctx, settled } = context()
    worker.scheduled({}, envWith(DOWN), ctx)
    await expect(settled()).resolves.toBeDefined()
    expect(logged(errors)).toMatch(/"msg":"jobs failed"/)
  })

  describe('with a database', () => {
    let db: Db
    let url: string
    beforeAll(async () => {
      let name: string
      ;({ db, name } = await testDatabase())
      url = urlFor(name)
    })

    it('the cron run works off due jobs', async () => {
      await queueSms(db, { to: '+99365000001', text: 'test', runAt: new Date(Date.now() - 60_000) })
      const { ctx, settled } = context()
      worker.scheduled({}, envWith(url), ctx)
      await settled()
      expect(logged(errors)).toBe('')
      expect(await db.select().from(jobs).where(isNull(jobs.doneAt))).toEqual([])
    })
  })
})
