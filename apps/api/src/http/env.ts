import type { Deps } from '../deps'
import type { users } from '../db/schema'

export type User = typeof users.$inferSelect

/** Hono environment of every route: dependencies, the request id and the signed-in person. */
export interface AppEnv {
  Variables: {
    deps: Deps
    requestId: string
    /** Set by the session middleware; null when signed out. */
    auth: { user: User; sessionId: string } | null
  }
}
