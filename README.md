# Yeral — web (yeral.app)

Web version of Yeral: booking at beauty & wellness salons in Ashgabat.
Phase 1 = the client marketplace, running on mock data. Plan: [docs/PLAN.md](docs/PLAN.md) · backend contract: [docs/API.md](docs/API.md).

Next.js 16 (App Router) · React 19 · Tailwind 4 · TanStack Query · next-intl · MapLibre + OpenFreeMap · Cloudflare Workers via OpenNext.

## Run

```bash
pnpm install        # also copies the MapLibre worker into public/vendor
pnpm dev            # http://localhost:3000
```

Demo login: any `+993` number, code **1234**. `+993 65 12 34 56` is the demo client with booking history.
«Ножницы» (`/nozhnitsy`) waits for the salon's answer — answer it from the demo panel on the booking page.
Other salons answer by themselves in a few seconds (or confirm instantly).

## Where things are

| | |
|---|---|
| `src/domain` | types, Ashgabat time, booking rules (slots, buffer, lead time, window, statuses) — ported from `../app` |
| `src/api/contract.ts` | the API the UI depends on |
| `src/api/mock` | in-browser backend: seed (24 salons), localStorage DB, synthetic occupancy, salon «answers» |
| `src/api/hooks.ts` | TanStack Query hooks used by pages |
| `src/app/(site)` | marketplace pages: home, search, salon, account, login, for-business |
| `src/app/(focus)/[slug]/book` | full-page booking wizard |
| `src/components` | `ui/` kit, `site/` header/footer/cards/map/search, `salon/`, `booking/`, `account/` |
| `messages/ru.json` | all UI strings (Turkmen comes as `tk.json`) |
| `public/photos` | stock photos (Unsplash/Pexels licence, see `manifest.json`) |

Data lives in the browser (`localStorage`, key `yeral-web-v1`). Profile → «Сбросить демо-данные» restores the seed.

## Deploy to Cloudflare

```bash
npx wrangler login            # once, opens the browser
pnpm run deploy               # opennextjs-cloudflare build + deploy → yeral-web.<account>.workers.dev
pnpm run preview              # the same Worker locally (http://localhost:8787)
```

Custom domain: Cloudflare dashboard → Workers & Pages → `yeral-web` → Settings → Domains & Routes → add `yeral.app`
(the domain has to be a zone in the same Cloudflare account).

`next` is pinned to **16.3.8**: 16.4.0 builds but fails at runtime on Workers with the current OpenNext adapter
(`Unexpected loadManifest(preview-props.json)`). Re-check when `@opennextjs/cloudflare` updates.
