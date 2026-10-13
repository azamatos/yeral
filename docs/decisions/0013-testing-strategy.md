# 0013. Testing strategy

- Status: Accepted 2026-10-13
- Decided by: owner (testing from the start) + Claude

## Context

Booking rules have many edge cases (hours, exceptions, buffer, lead time, window, holds), four apps share components,
and flows cross apps (client books → salon confirms → client sees it). Agents working in parallel need fast, trustworthy
feedback before merging.

## Decision

| Level | Tool | Covers | Runs |
|---|---|---|---|
| Static | TypeScript, ESLint, Steiger, Prettier | types, hooks/compiler rules, FSD imports, format | pre-commit on staged files + CI |
| Unit | **Vitest** (node) | `@yeral/domain` rules, sdk mapping, helpers | CI on every PR; domain coverage ≥ 90 % |
| Component | **Storybook stories run by Vitest browser mode** (`@storybook/addon-vitest`, Chromium via Playwright) | interactions (`play`), accessibility (axe), visual screenshots (`toMatchScreenshot`, Linux baselines) | CI on PRs touching UI |
| API | **Vitest + `app.request()`** against Postgres (Docker service in CI) | endpoints, auth, roles, `409` conflicts, migrations | CI on PRs touching api/contract/domain |
| End to end | **Playwright** | cross-app flows on the local stack (Compose); smoke on staging after deploy | CI for affected apps; nightly on staging |
| API mocks | **MSW** | contract-shaped responses in Storybook and component tests | — |

Rules:

- A bug fix comes with a test that fails without it.
- A rule in `@yeral/domain` gets a unit test in the same PR.
- A new component gets stories (the stories are its tests); a new endpoint gets API tests.
- Critical flows have Playwright specs: search → book (any master and a chosen master), salon confirm/decline/propose,
  cancel, move, review, login.
- Tests use the same seed as development; each API test runs in a transaction or a fresh schema.
- The `testing` skill says which level to use for what.

## Why these tools

- **Vitest**: same config and transforms as Vite apps, fast, ESM-native, has a real browser mode.
- **Playwright**: several tabs and origins in one test (client and business are different subdomains), all three
  browser engines, parallel and free. Cypress handles multiple origins poorly.
- **Storybook + Vitest** instead of separate component tests: one artefact serves docs, review and tests.
- **Screenshots in Vitest browser mode** instead of Chromatic: free, in our CI; Chromatic can be added later for a review UI.

## Consequences

- CI needs Chromium and a Postgres service; turbo `--affected` keeps it fast.
- Visual baselines are generated on Linux in CI only (fonts differ on macOS).
