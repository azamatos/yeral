/**
 * The app's one way to the api (AGENTS.md rule 3): the typed client, the query cache and `@yeral/sdk`'s query and
 * mutation options, made once at start (`app/main.tsx`) and handed down through `SdkProvider` and the router context.
 * Stories and tests make their own with a `fetch` that answers like the api.
 */
import { QueryClient } from '@tanstack/react-query'
import { createClient, createSdk, isApiError, type ClientOptions, type Sdk } from '@yeral/sdk'

export interface Api {
  queryClient: QueryClient
  sdk: Sdk
}

/** A refusal (4xx) answers the same the second time; a lost connection or a server error may not. */
export function shouldRetry(failures: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failures < 2
}

export function createApi(options: ClientOptions): Api {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 15_000 },
      mutations: { retry: false },
    },
  })
  return { queryClient, sdk: createSdk(createClient(options), queryClient) }
}
