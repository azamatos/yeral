/** Where API tests find Postgres: CI's service container, or the local one from `pnpm db:up`. */
export const ADMIN_URL = process.env.TEST_DATABASE_URL ?? 'postgres://yeral:yeral@localhost:5432/postgres'

/**
 * Every database a test run creates is named `yeral_test_<run>_…`, so runs from several worktrees can share one server:
 * the run's template is `…_template`, each test file gets a copy, and the run drops them all at the end.
 */
export const runPrefix = (run: string) => `yeral_test_${run}_`
export const templateFor = (run: string) => `${runPrefix(run)}template`

export function urlFor(database: string): string {
  const url = new URL(ADMIN_URL)
  url.pathname = `/${database}`
  return url.toString()
}
