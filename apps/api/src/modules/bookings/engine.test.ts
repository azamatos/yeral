/** The engine's transaction: a time lost to another booking or to the hours comes back with the nearest free times. */
import { describe, expect, it } from 'vitest'
import { testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import { ApiError } from '../../http/errors'
import { inTransaction } from './engine'

describe('inTransaction', () => {
  it('a time the hours no longer hold is slot_taken with the nearest free times', async () => {
    const { db } = await testDatabase()
    const t = testApp(db)
    const nearest = [{ date: '2026-10-16', start: 600, end: 660 }]
    const refused = inTransaction(
      t.deps,
      () => Promise.reject(new ApiError('slot_taken', { alternatives: [] })),
      async () => nearest,
    )
    await expect(refused).rejects.toMatchObject({ code: 'slot_taken', details: { alternatives: nearest } })
    // a refusal that names its times keeps them; any other error passes as it is
    const named = [{ date: '2026-10-16', start: 720, end: 780 }]
    await expect(
      inTransaction(
        t.deps,
        () => Promise.reject(new ApiError('slot_taken', { alternatives: named })),
        async () => nearest,
      ),
    ).rejects.toMatchObject({ details: { alternatives: named } })
    await expect(
      inTransaction(
        t.deps,
        () => Promise.reject(new ApiError('not_found')),
        async () => nearest,
      ),
    ).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})
