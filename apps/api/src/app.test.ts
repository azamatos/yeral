import { describe, expect, it, vi } from 'vitest'
import { createApp } from './app'

describe('error handler', () => {
  it('answers with the internal error body and logs it when the entry failed before providing dependencies', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createApp(() => Promise.reject(new Error('no database config')))
    const res = await app.request('/v1/health')
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: { code: 'internal' } })
    expect(errors.mock.calls.flat().join('\n')).toMatch(/"msg":"unhandled".*no database config/)
  })
})
