# apps/legacy

The first web version of Yeral: the Next.js client marketplace on mock data, deployed to yeral.app.
**Frozen**: fix only what's broken in production. New work goes into the new apps (see the root `AGENTS.md` and
`docs/memory-bank/progress.md`); this app is deleted at milestone M4.

- Deploy: production only, from a release (`@yeral/legacy@x.y.z` tag) or `pnpm --filter @yeral/legacy run deploy`.
- `next` is pinned to 16.3.8: 16.4.0 fails on Workers with the current OpenNext adapter.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
