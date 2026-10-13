import type { Api } from './contract'
import { mockApi } from './mock'

/**
 * The one place that decides which backend the app talks to.
 * Phase 5: `NEXT_PUBLIC_API=http` → src/api/http (same interface, real REST calls).
 */
export const api: Api = mockApi

export const isMock = true

export * from './contract'
