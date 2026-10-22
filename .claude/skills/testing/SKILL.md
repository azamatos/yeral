---
name: testing
description: Choose and write the right test in Yeral — Vitest unit tests for domain rules, Storybook stories as component tests (interactions, a11y, screenshots), API tests against Postgres, Playwright end-to-end flows across apps. Use when adding a rule, component, endpoint or flow, when fixing a bug, or when CI fails.
---

# Testing

Strategy: ADR 0013. Today: Vitest unit tests for the booking rules in `packages/domain/src/*.test.ts`, Storybook story
tests in `apps/storybook`; API and Playwright tests arrive with M2–M3.

## Which test

| You changed… | Write | Where | Run |
|---|---|---|---|
| a rule in `@yeral/domain` (slots, statuses, deadlines) | Vitest unit test, table of cases | `packages/domain/src/<file>.test.ts` | `pnpm test --filter=@yeral/domain` |
| a helper in `lib`, `sdk`, `i18n` | Vitest unit test | next to the file | `pnpm test --filter=@yeral/<pkg>` |
| a component in `@yeral/ui` or an entity/feature UI | stories with `play` functions (they run as tests) | `<name>.stories.tsx` | `pnpm test:stories` (Chromium; first time: `pnpm --filter @yeral/storybook exec playwright install chromium`) |
| an endpoint | API test with `app.request()` on the test database | `apps/api/src/modules/<area>/*.test.ts` | `pnpm test --filter=@yeral/api` |
| a user flow across screens or apps | Playwright spec | `apps/<app>/e2e/*.spec.ts`, cross-app in `e2e/` at the root | `pnpm e2e` |
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
- **Playwright**: use roles and labels (`getByRole`), not CSS; one browser context per person (client, salon) to test
  mirror screens; wait for UI states, never `waitForTimeout`; demo login code `1234`.
- Tests must pass in parallel and in any order. No snapshots of whole pages.

## When CI fails

Read the failing job's log (`gh run view --log-failed`), reproduce locally with the same command, fix the cause.
Don't skip or loosen a test to get green; if a test is wrong, fix the test in the same PR and say why.
