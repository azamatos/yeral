import { base } from '@yeral/config/vitest'
import { defineConfig, mergeConfig } from 'vitest/config'

// API tests run against Postgres (TEST_DATABASE_URL, default: `pnpm db:up`): one migrated template database,
// one copy per test file (test/db.ts).
export default mergeConfig(
  base,
  defineConfig({
    test: {
      globalSetup: ['./test/global-setup.ts'],
      testTimeout: 20_000,
      hookTimeout: 60_000,
    },
  }),
)
