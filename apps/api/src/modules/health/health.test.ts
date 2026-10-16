import { beforeAll, describe, expect, it } from 'vitest'
import { testApp, ORIGIN } from '../../../test/app'
import { testDatabase } from '../../../test/db'

describe('system endpoints', () => {
  let app: ReturnType<typeof testApp>['app']
  beforeAll(async () => {
    const { db } = await testDatabase()
    app = testApp(db).app
  })

  it('reports health with the database reachable', async () => {
    const res = await app.request('/v1/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, db: true })
    expect(res.headers.get('X-Yeral-Version')).toBeTruthy()
  })

  it('serves the build stamp and the OpenAPI document', async () => {
    expect(await (await app.request('/version.json')).json()).toMatchObject({ app: 'api' })
    const doc = (await (await app.request('/openapi.json')).json()) as { openapi: string; paths: Record<string, unknown> }
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.paths).toHaveProperty('/v1/health')
  })

  it('answers unknown paths with the error body', async () => {
    const res = await app.request('/v1/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: { code: 'not_found' } })
  })

  it('allows our sites with credentials and refuses mutations from other origins', async () => {
    const preflight = await app.request('/v1/health', {
      method: 'OPTIONS',
      headers: { Origin: ORIGIN, 'Access-Control-Request-Method': 'POST' },
    })
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN)
    expect(preflight.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    const foreign = await app.request('/v1/health', { method: 'POST', headers: { Origin: 'https://evil.example' } })
    expect(foreign.status).toBe(403)
  })
})
