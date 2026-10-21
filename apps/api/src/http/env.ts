import type { Deps } from '../deps'
import type { admins, users } from '../db/schema'

export type User = typeof users.$inferSelect
/** A Ýeral team account (ADR 0026). */
export type Admin = typeof admins.$inferSelect

/** Hono environment of every route: dependencies, the request id and the signed-in person. */
export interface AppEnv {
  Variables: {
    deps: Deps
    requestId: string
    /** Set by the session middleware; null when signed out. */
    auth: { user: User; sessionId: string } | null
    /** Set by the admin session middleware on `/v1/admin/*`; null when signed out. */
    admin: { admin: Admin; sessionId: string } | null
  }
}
