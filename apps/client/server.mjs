// The client site's Node server (ADR 0024). `pnpm --filter @yeral/client build` bundles this file into dist/node.mjs
// next to what Vite built, so its paths are dist's: the browser's files from ./client, every page rendered by TanStack
// Start's handler from ./server. Run it with `pnpm --filter @yeral/client start` or the Docker image.
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
// left out of the bundle: Vite's build of the renderer (dist/server)
import start from './server/server.js'

const root = fileURLToPath(new URL('./client', import.meta.url))
const app = new Hono()

// hashed files never change; one that isn't there is a 404, never a page (a tab still on the last build asks for its
// old chunks, and a page cached under a script's address would break it for a year)
app.use('/assets/*', serveStatic({ root, onFound: (_path, c) => c.header('Cache-Control', 'public, max-age=31536000, immutable') }))
app.get('/assets/*', (c) => c.notFound())
// the build stamp, asked for again each time (no other file sits at the top: pages never pay a disk lookup)
app.get('/version.json', serveStatic({ root, onFound: (_path, c) => c.header('Cache-Control', 'no-cache') }))
// every page
app.all('*', (c) => start.fetch(c.req.raw))

const port = Number(process.env.PORT ?? 3000)
const server = serve({ fetch: app.fetch, port }, (info) => console.warn(`client site on :${info.port}`))

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)))
