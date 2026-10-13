---
name: fsd
description: Decide where code goes in the Yeral monorepo (Feature-Sliced Design + shared packages). Use when creating, moving, splitting or importing code in apps/ or packages/ — picks the layer, slice and segment, the public API and the allowed imports, and decides when code is promoted to a package.
---

# Where code goes

Architecture reference: `docs/memory-bank/systemPatterns.md`, ADR 0004.
Until milestone M3 the live marketplace is the frozen Next app in `apps/legacy` (folders by kind). Don't restructure it piecemeal;
FSD code goes into `apps/*` and `packages/*` of the monorepo.

## 1. Look for what exists

Search before creating: `rg -n "<Name>|<verb>" apps packages`, and the table "Where shared things live" in
`docs/memory-bank/techContext.md`. Extend an existing slice rather than adding a sibling that overlaps.

## 2. Pick the place

| The code is… | Place |
|---|---|
| a URL | `apps/<app>/src/app/routes/<path>.tsx`: thin, `validateSearch` + `loader` + `head` + `component` from a page |
| a whole screen | `pages/<screen>/` (`salon`, `booking`, `account-bookings`, `calendar`) |
| a block used by 2+ pages | `widgets/<name>/` (`header`, `salon-map`) |
| a user action that changes something (verb) | `features/<verb-noun>/` (`cancel-booking`, `toggle-favorite`, `pick-slot`) |
| how a business object looks in this app (noun) | `entities/<noun>/` (`salon`, `booking`, `staff`) |
| app plumbing without business words | `shared/<segment>/` (`config/env.ts`, `api/sdk.ts`, `lib/…`) |
| design-system piece, no domain words | `packages/ui` |
| pure rule, time, phone, id | `packages/domain` |
| a shape on the wire (DTO, input, enum, error code) | `packages/contract` |
| API call, query key, mutation | `packages/sdk` (slice-specific wrappers in the slice's `api/`) |
| translations, formatters | `packages/i18n` (app-specific messages in `apps/<app>/messages`) |
| universal helper with no domain (.ics, links, storage, env) | `packages/lib` |
| an entity or feature slice a **second app** needs | `packages/entities` / `packages/features`, same slice structure |

Pages first: when unsure, keep it in the page slice. Move it down when a second consumer appears.

## 3. Build the slice

```
features/cancel-booking/
  index.ts                       export { CancelBookingButton } from './ui/cancel-booking-button'
  ui/cancel-booking-button.tsx
  model/use-cancel-booking.ts    mutation wrapper, local state, zod schema
```

- Segments: `ui`, `model`, `api`, `lib`, `config`, only the ones needed.
- `index.ts` exports only what other slices use. Import a slice only through its `index.ts`.
- Names: kebab-case; features are verb-noun, entities are nouns, pages are screen names.

## 4. Check imports

- A layer imports only from lower layers: `app → pages → widgets → features → entities → shared → packages`.
- No imports between slices on the same layer. Entities that must reference each other use `entities/<a>/@x/<b>.ts`.
- Packages: follow the dependency rules in `systemPatterns.md`; declare internal deps in `package.json` as `workspace:*`.
  `@yeral/ui` never imports domain, sdk or i18n (text comes in as props).

## 5. Verify

`pnpm lint:fsd && pnpm typecheck` (+ `pnpm lint`). When something moved to a package, add it to the "Where shared things live"
table in `techContext.md`.

## Smells

- A widget used by one page → it belongs in the page.
- A feature with no action, only rendering → it's an entity or a page part.
- `shared/` or `@yeral/ui` mentioning salons, bookings or masters → move it to entities.
- Deep imports `../../other-slice/ui/x` → go through the slice's `index.ts` or rethink the layer.
- A layer-wide barrel (`features/index.ts`) → delete it; import slices individually.
