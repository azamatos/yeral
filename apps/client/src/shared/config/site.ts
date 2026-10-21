/**
 * Hosts, cookie domain and environment (AGENTS.md rule 6): read once from the build's `VITE_YERAL_ENV`,
 * `VITE_YERAL_DOMAIN` and `PORT_BASE`, so no file names a domain. Local dev without variables = `local` on PORT_BASE.
 * The server-side render reads the same values (Vite writes them into both builds).
 */
import { siteFromEnv } from '@yeral/lib/site'

export const site = siteFromEnv(import.meta.env, 'VITE_')

/**
 * Where requests to the api go. The browser uses the public address; the server that renders a page may reach the api
 * by another one inside its network (`API_INTERNAL_URL`, e.g. `http://api:3004` in the Docker stack, where
 * `api.yeral.localhost` would be the renderer's own container), read at run time.
 */
export function apiUrl(): string {
  if (import.meta.env.SSR) return process.env.API_INTERNAL_URL || site.urls.api
  return site.urls.api
}
