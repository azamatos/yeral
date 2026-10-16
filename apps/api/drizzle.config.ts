import { defineConfig } from 'drizzle-kit'

// `pnpm db:generate` writes a new SQL migration from the schema. Never edit a merged migration (skill api-endpoint).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  casing: 'snake_case',
})
