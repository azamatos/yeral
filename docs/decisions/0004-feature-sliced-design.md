# 0004. Feature-Sliced Design inside apps

- Status: Accepted 2026-10-13
- Decided by: owner (FSD) + Claude (how it maps onto the monorepo)

## Context

Four apps written largely by an AI agent need a structure where the place of any file is predictable and imports
can't tangle. The Next app grouped files by kind (`components/site`, `components/booking`), which doesn't scale to
the business workspace.

## Decision

- Each app uses FSD layers `app → pages → widgets → features → entities → shared`; a layer imports only from below.
- Slices on the same layer don't import each other (entities may, explicitly, through `@x`).
- Each slice exposes `index.ts`; segments are `ui`, `model`, `api`, `lib`, `config` as needed.
- **Pages first**: code starts in the page slice and moves down when it gets a second consumer.
- **Packages are the cross-app lower layers**: `@yeral/ui` (shared/ui), `@yeral/lib`, `@yeral/domain`, `@yeral/contract`,
  `@yeral/sdk`, `@yeral/i18n`; plus `@yeral/entities` and `@yeral/features` once a second app needs a slice.
- TanStack Router route files live in `src/app/routes` and stay thin, importing pages.
- Enforced with Steiger per app and ESLint import rules. The rules are spelled out in the `fsd` project skill.

## Consequences

- Predictable placement; refactors move whole slices.
- Some ceremony (index files, choosing a layer); the skill and Steiger keep it consistent.
- "Feature vs entity vs widget" debates are settled by the skill's decision table.

## Alternatives considered

- **Folders by kind** (components/hooks/utils): fine for the first app, tangles across four.
- **Strict FSD everywhere including packages**: packages are flat by purpose instead; one layer each.
