/** Where API tests find Postgres: CI's service container, or the local one from `pnpm db:up`. */
export const ADMIN_URL = process.env.TEST_DATABASE_URL ?? 'postgres://yeral:yeral@localhost:5432/postgres'
export const TEMPLATE_DB = 'yeral_test_template'

export function urlFor(database: string): string {
  const url = new URL(ADMIN_URL)
  url.pathname = `/${database}`
  return url.toString()
}
