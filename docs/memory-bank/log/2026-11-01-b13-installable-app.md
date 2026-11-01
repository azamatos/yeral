# The installable app (P4 slice 4, PR B13; feat/b13-installable-app)

Slice 4's B13 (`log/2026-10-31-slice-4-plan.md`, D2 = A, decision 11): book F-096.

## What's there

- `vite-plugin-pwa` in `apps/business/vite.config.ts`: the manifest, an auto-updating worker precaching the built shell,
  `/v1/` and `/media/` never served from it. `public/icons`: 192, 512, the apple-touch 180, resized with `sips` from
  `docs/design/assets/brand/yeral-icon.png`.
- `widgets/workspace-shell/ui/offline-banner.tsx`: «You're offline…» while `navigator.onLine` is false.
- `e2e/tests/installable.spec.ts`: on CI's Docker stack the manifest and worker are served `no-cache`, as
  `infra/docker/static.Caddyfile` promises everything outside `/assets/*`. No Caddy change; the CSP's `default-src 'self'`
  covers the worker and the manifest.

## Seen, not done here

- The 512 icon is upscaled from 285 px: it needs a larger source from the owner.
- Installing on a real phone is part of the live click test: it can't be proved in CI.
