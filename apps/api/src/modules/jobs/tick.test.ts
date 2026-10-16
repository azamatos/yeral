import { isNull } from 'drizzle-orm'
import pg from 'pg'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import { urlFor } from '../../../test/env'
import type { Db } from '../../db/client'
import { jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { queueSms } from '../../notify'
import type { Logger } from '../../ports/log'
import { JOBS_LOCK, jobsTick } from './tick'

function captureLog(): Logger & { lines: string[] } {
  const lines: string[] = []
  const write = (msg: string, data?: Record<string, unknown>) => void lines.push(`${msg} ${JSON.stringify(data ?? {})}`)
  return { lines, debug: write, info: write, warn: write, error: write }
}

describe('jobs tick', () => {
  let db: Db
  let url: string
  let reset: () => Promise<void>
  beforeAll(async () => {
    let name: string
    ;({ db, reset, name } = await testDatabase())
    url = urlFor(name)
  })
  beforeEach(() => reset())

  const setup = () => {
    const { deps, sms } = testApp(db)
    const log = captureLog()
    return { deps: { ...deps, log }, sms, log }
  }
  const due = () => queueSms(db, { to: '+99365000001', text: 'test', runAt: new Date(DEMO_NOW - 60_000) })

  it('skips while another runner holds the jobs lock, and runs once it is free', async () => {
    const { deps, sms } = setup()
    await due()
    const other = new pg.Client({ connectionString: url })
    await other.connect()
    try {
      await other.query('begin')
      await other.query(`select pg_advisory_xact_lock(${JOBS_LOCK})`)
      await jobsTick(deps)
      expect(sms.sent).toEqual([])
      expect(await db.select().from(jobs).where(isNull(jobs.doneAt))).toHaveLength(1)
      await other.query('commit')
    } finally {
      await other.end()
    }
    await jobsTick(deps)
    expect(sms.sent).toHaveLength(1)
    expect(await db.select().from(jobs).where(isNull(jobs.doneAt))).toEqual([])
  })

  it('two overlapping ticks work each due job once', async () => {
    const { deps, sms } = setup()
    await due()
    await Promise.all([jobsTick(deps), jobsTick(deps)])
    expect(sms.sent).toHaveLength(1)
  })

  it('logs a failed run instead of rejecting', async () => {
    const { deps, log } = setup()
    const broken: Deps = { ...deps, db: { transaction: () => Promise.reject(new Error('connection refused')) } as unknown as Db }
    await expect(jobsTick(broken)).resolves.toBeUndefined()
    expect(log.lines.join('\n')).toMatch(/^jobs failed .*connection refused/m)
  })
})
