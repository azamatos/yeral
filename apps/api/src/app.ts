/**
 * The api as one `fetch` handler (ADR 0005), served by Node in Docker (ADR 0024) and called directly by the tests.
 * The entry (`entry/node.ts`) provides the dependencies; routes live in `modules/<area>/routes.ts` (systemPatterns.md).
 */
import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import type { Context, MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import type { Deps } from './deps'
import { ApiError, errorBody, errorResponse, validationDetails } from './http/errors'
import type { AppEnv } from './http/env'
import { adminBusinessRoutes } from './modules/admin/business-routes'
import { adminReviewRoutes } from './modules/admin/review-routes'
import { adminRoutes } from './modules/admin/routes'
import { adminSessionMiddleware } from './modules/admin/session'
import { authRoutes } from './modules/auth/routes'
import { sessionMiddleware } from './modules/auth/session'
import { availabilityRoutes } from './modules/availability/routes'
import { linkRoutes } from './modules/bookings/link-routes'
import { bookingRoutes } from './modules/bookings/routes'
import { calendarRoutes } from './modules/calendar/routes'
import { catalogRoutes } from './modules/catalog/routes'
import { clientRoutes } from './modules/clients/routes'
import { demoGuard } from './modules/demo/guard'
import { demoRoutes } from './modules/demo/routes'
import { eventRoutes } from './modules/events/routes'
import { healthRoutes } from './modules/health/routes'
import { meRoutes } from './modules/me/routes'
import { menuRoutes } from './modules/menu/routes'
import { requestRoutes } from './modules/requests/routes'
import { reviewRoutes } from './modules/reviews/routes'
import { setupRoutes } from './modules/setup/routes'
import { settingsRoutes } from './modules/settings/routes'
import { teamRoutes } from './modules/team/routes'
import { createLogger } from './ports/log'
import { build } from './version'

export type { AppEnv } from './http/env'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const fallbackLog = createLogger('info', { app: 'api' })

export function createApp(provide: MiddlewareHandler<AppEnv>) {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) return c.json(errorBody('validation_error', validationDetails(result.error)), 400)
    },
  })

  app.use('*', requestId())
  app.use('*', provide)
  app.use('*', async (c, next) => {
    await next()
    c.header('X-Yeral-Version', build.version)
  })
  app.use(
    '*',
    cors({
      origin: (origin, c: Context<AppEnv>) => (c.var.deps.site.origins.includes(origin) ? origin : null),
      credentials: true,
      maxAge: 600,
    }),
  )
  // Cookie sessions + SameSite=Lax; mutations from a browser must also come from one of our sites (ADR 0019).
  app.use('*', async (c, next) => {
    const origin = c.req.header('Origin')
    if (!SAFE_METHODS.has(c.req.method) && origin && !c.var.deps.site.origins.includes(origin)) {
      return c.json(errorBody('forbidden', undefined, 'origin'), 403)
    }
    await next()
  })

  app.use('/v1/*', sessionMiddleware)
  // a demo account tries the demo workspace and nothing else (book F-242)
  app.use('/v1/*', demoGuard)
  // the Ýeral team's own sessions, from the admin tool's site only (ADR 0026)
  app.use('/v1/admin/*', adminSessionMiddleware)

  app.onError((err, c) => {
    if (err instanceof ApiError) return errorResponse(c, err)
    // the entry may have failed before providing deps (bad config, no database binding)
    const log = (c.var.deps as Deps | undefined)?.log ?? fallbackLog
    log.error('unhandled', {
      requestId: c.var.requestId,
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
    })
    return c.json(errorBody('internal'), 500)
  })
  app.notFound((c) => c.json(errorBody('not_found'), 404))

  const routes = app
    .route('/v1', healthRoutes)
    .route('/v1', authRoutes)
    .route('/v1', meRoutes)
    .route('/v1', catalogRoutes)
    .route('/v1', availabilityRoutes)
    .route('/v1', bookingRoutes)
    .route('/v1', linkRoutes)
    .route('/v1', eventRoutes)
    .route('/v1', teamRoutes)
    .route('/v1', settingsRoutes)
    .route('/v1', menuRoutes)
    .route('/v1', requestRoutes)
    .route('/v1', calendarRoutes)
    .route('/v1', clientRoutes)
    .route('/v1', reviewRoutes)
    .route('/v1', setupRoutes)
    .route('/v1', demoRoutes)
    .route('/v1', adminRoutes)
    .route('/v1', adminBusinessRoutes)
    .route('/v1', adminReviewRoutes)

  app.get('/version.json', (c) => c.json({ app: 'api', ...build }))
  // uploaded photos (book F-101): a key never changes what it holds, so browsers keep them
  app.get('/media/up/*', async (c) => {
    const file = await c.var.deps.storage.get(c.req.path.replace(/^\/media\//, ''))
    if (!file) return c.json(errorBody('not_found'), 404)
    return c.body(file.data, 200, { 'Content-Type': file.type, 'Cache-Control': 'public, max-age=31536000, immutable' })
  })
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Ýeral API', version: build.version, description: 'Booking for any business that sells time. Guide: docs/API.md' },
  })
  app.get('/docs', Scalar({ url: '/openapi.json', pageTitle: 'Ýeral API' }))

  return routes
}

/** The typed route tree for `@yeral/sdk` (Hono RPC, type-only import). */
export type AppType = ReturnType<typeof createApp>
