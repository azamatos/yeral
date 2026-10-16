import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { Db } from './client'

/** The SQL migrations in git (forward only); the bundled Node build copies them next to dist/node.js. */
export const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations', import.meta.url))

export async function runMigrations(db: Db, migrationsFolder = MIGRATIONS_DIR): Promise<void> {
  await migrate(db, { migrationsFolder })
}
