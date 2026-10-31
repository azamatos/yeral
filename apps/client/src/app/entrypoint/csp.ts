import { OPENFREEMAP_STYLE } from '@yeral/ui/map-frame'
import { site } from '@/shared/config'

/** Where the map's style, glyphs, sprites and tiles come from (MapFrame). */
const TILES = new URL(OPENFREEMAP_STYLE).origin

/** A fresh nonce for one page: 16 random bytes as base64, the form a CSP `'nonce-…'` expects. */
export function cspNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
}

/**
 * The client site's Content Security Policy (infra/server/README.md, "Security headers"). The edge Caddy sets none
 * for this site: TanStack Start writes inline scripts into every page (hydration, React's streaming), which a
 * `script-src 'self'` would block, so each request gets its own nonce (start.ts), the router puts it on those scripts
 * (`ssr.nonce`, router.tsx) and the response names it here. Every source has a use the log note
 * `docs/memory-bank/log/2026-10-30-hsts-csp.md` lists; nothing is allowed on a guess.
 */
export function contentSecurityPolicy(nonce: string, hosts: { api: string; tiles: string } = { api: site.urls.api, tiles: TILES }): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}'`,
    // React and MapLibre set style attributes, MapLibre adds a <style> of its own
    `style-src 'self' 'unsafe-inline'`,
    // uploaded photos come from the api; MapLibre draws tiles from blobs and a transparent data: pixel
    `img-src 'self' data: blob: ${hosts.api}`,
    // Onest is bundled (@fontsource-variable/onest)
    `font-src 'self'`,
    // the api (the sdk's requests and the events stream) and OpenFreeMap (style, glyphs, sprites, tiles)
    `connect-src 'self' ${hosts.api} ${hosts.tiles}`,
    // MapLibre's worker is the bundled file under /assets/ (MapFrame's `setWorkerUrl`); a blob only for a cross-origin one
    `worker-src 'self'`,
    // the same as the edge's X-Frame-Options SAMEORIGIN
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
  ].join('; ')
}
