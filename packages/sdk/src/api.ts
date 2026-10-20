/**
 * An app's one way to the api (AGENTS.md rule 3): the typed client, the query cache and the sdk's query and mutation
 * options, made once (the business app at start; the client site once per request on the server and once in the
 * browser) and handed down through `SdkProvider` (`@yeral/sdk/react`) and the router context. Stories and tests make
 * their own with a `fetch` that answers like the api.
 */
import { QueryClient } from '@tanstack/react-query'
import { createClient, isApiError, type Client, type ClientOptions } from './client'
import { createSdk, type Sdk } from './sdk'

export interface Api {
  /** The typed client, for `startEvents(client, queryClient)`. */
  client: Client
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
  const client = createClient(options)
  return { client, queryClient, sdk: createSdk(client, queryClient) }
}
