/** Build stamp for `/version.json` and the `X-Yeral-Version` header; set by the build (esbuild / wrangler `define`). */
declare const __BUILD__: { version: string; commit: string; builtAt: string } | undefined

export const build = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { version: '0.0.0-dev', commit: 'dev', builtAt: '' }
