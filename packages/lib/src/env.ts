/**
 * Environment variables, checked once at start-up: each app keeps its schema in `shared/config/env.ts`, the api in
 * `config.ts`. The error names the variables that are missing or wrong, never their values (they may be secrets).
 */
import type { z } from 'zod'

export class EnvError extends Error {
  constructor(readonly variables: string[]) {
    super(`Invalid or missing environment variables: ${variables.join(', ')}`)
    this.name = 'EnvError'
  }
}

export function parseEnv<S extends z.ZodType>(schema: S, source: Record<string, unknown>): z.output<S> {
  const result = schema.safeParse(source)
  if (result.success) return result.data
  const names = [...new Set(result.error.issues.map((i) => String(i.path[0] ?? '(root)')))]
  throw new EnvError(names)
}
