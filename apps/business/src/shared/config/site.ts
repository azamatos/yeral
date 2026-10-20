/**
 * Hosts, cookie domain and environment (AGENTS.md rule 6): read once from the build's `VITE_YERAL_ENV`,
 * `VITE_YERAL_DOMAIN` and `PORT_BASE`, so no file names a domain. Local dev without variables = `local` on PORT_BASE.
 */
import { siteFromEnv } from '@yeral/lib/site'

export const site = siteFromEnv(import.meta.env, 'VITE_')
