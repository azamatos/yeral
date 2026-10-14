/**
 * The api as one `fetch` handler (ADR 0005): the same app runs on Cloudflare Workers and on Node in Docker.
 * Entries (`entry/*.ts`) provide the dependencies; routes live in `modules/<area>/routes.ts` (systemPatterns.md).
 */
import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import type { Context, MiddlewareHandler } from 'hono'
import { cors } from 'hono/cors'
import { requestId } from 'hono/request-id'
import { ApiError, errorBody, errorResponse, validationDetails } from './http/errors'
import type { AppEnv } from './http/env'
import { authRoutes } from './modules/auth/routes'
import { sessionMiddleware } from './modules/auth/session'
import { availabilityRoutes } from './modules/availability/routes'
import { bookingRoutes } from './modules/bookings/routes'
import { catalogRoutes } from './modules/catalog/routes'
import { eventRoutes } from './modules/events/routes'
import { healthRoutes } from './modules/health/routes'
import { meRoutes } from './modules/me/routes'
import { build } from './version'

export type { AppEnv } from './http/env'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

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

  app.onError((err, c) => {
    if (err instanceof ApiError) return errorResponse(c, err)
    c.var.deps.log.error('unhandled', {
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
    .route('/v1', eventRoutes)

  app.get('/version.json', (c) => c.json({ app: 'api', ...build }))
  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'Ýeral API', version: build.version, description: 'Booking for any business that sells time. Guide: docs/API.md' },
  })
  app.get('/docs', Scalar({ url: '/openapi.json', pageTitle: 'Ýeral API' }))

  return routes
}

/** The typed route tree for `@yeral/sdk` (Hono RPC, type-only import). */
export type AppType = ReturnType<typeof createApp>
