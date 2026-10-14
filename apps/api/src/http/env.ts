import type { Deps } from '../deps'

/** Hono environment of every route: dependencies and the request id. */
export interface AppEnv {
  Variables: {
    deps: Deps
    requestId: string
  }
}
