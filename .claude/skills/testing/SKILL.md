---
name: testing
description: Choose and write the right test in Yeral — Vitest unit tests for domain rules, Storybook stories as component tests (interactions, a11y, screenshots), API tests against Postgres, Playwright end-to-end flows across apps. Use when adding a rule, component, endpoint or flow, when fixing a bug, or when CI fails.
---

# Testing

Strategy: ADR 0013. Today: Vitest unit tests in `packages/*` and the api, Storybook story tests in `apps/storybook`,
API tests in `apps/api` against Postgres, and the Playwright flows in `e2e/` (the booking loop; since 2026-10-31).

## Which test

| You changed… | Write | Where | Run |
|---|---|---|---|
| a rule in `@yeral/domain` (slots, statuses, deadlines) | Vitest unit test, table of cases | `packages/domain/src/<file>.test.ts` | `pnpm test --filter=@yeral/domain` |
| a helper in `lib`, `sdk`, `i18n` | Vitest unit test | next to the file | `pnpm test --filter=@yeral/<pkg>` |
| a component in `@yeral/ui` or an entity/feature UI | stories with `play` functions (they run as tests) | `<name>.stories.tsx` | `pnpm test:stories` (Chromium; first time: `pnpm --filter @yeral/storybook exec playwright install chromium`) |
| an endpoint | API test with `app.request()` on the test database | `apps/api/src/modules/<area>/*.test.ts` | `pnpm test --filter=@yeral/api` |
| a user flow across screens or apps (a client does, the business answers, the client sees it) | Playwright spec | `e2e/tests/<flow>.spec.ts` (`@yeral/e2e`; helpers in `e2e/src`) | `pnpm e2e` against running apps (operations.md, "End-to-end flows"); CI runs it on the Docker stack |
| a bug | the smallest test above that fails without the fix | — | — |

## How

- **Unit**: pure inputs → outputs; fix the clock (`vi.setSystemTime`) and use Ashgabat dates as strings; one `describe` per
  function, `it.each` tables for edge cases (closed day, exception, buffer, lead time, window end, holds).
- **Stories as tests**: every variant renders without console errors; `play` covers keyboard and pointer interaction
  (`userEvent`, `expect` from `storybook/test`); a11y runs automatically (axe) and violations fail; screenshots
  (`toMatchScreenshot`) are compared in CI on Linux only. Update baselines with the `update-screenshots` PR label, never by hand on macOS.
- **API data**: stories and component tests mock the API with MSW handlers built from `@yeral/contract` fixtures; never hit a real API.
- **API tests**: each test runs in a transaction rolled back at the end (or a fresh schema); seed with factories, not the full demo seed;
  cover success, validation error (400), unauthorised (401/403), not found, conflict (409 `slot_taken`).
- **Playwright**: a flow the slice's "Done when" names, across apps or with the push channel in it; a single screen's
  behaviour is a story. Roles and accessible names (`getByRole`) from the apps' `en.json`, not CSS or test ids; a
  control without a name is an a11y bug: name it in the app. One browser context per person (client, salon) to test
  mirror screens; wait for UI states (`expect`), never `waitForTimeout`. Sign in with the code the screen shows
  (`signInWithCode` in `e2e/src/sign-in.ts`); a fresh random client number per test (`freshPhone`), the seed's
  Glow Studio and its owner, who signs in once per run (`tests/owner.setup.ts`, a `storageState`). The client site
  is rendered on the server: the first click on a page retries until React has taken over (`expect(...).toPass()`).
  Open a request on the calendar from its address (`?date=&request=`) rather than its block, which may sit under a
  neighbour's. Nothing is reset: a test leaves only what the next run doesn't depend on.
- Tests must pass in parallel and in any order. No snapshots of whole pages.

## When CI fails

Read the failing job's log (`gh run view --log-failed`), reproduce locally with the same command, fix the cause.
Don't skip or loosen a test to get green; if a test is wrong, fix the test in the same PR and say why.
