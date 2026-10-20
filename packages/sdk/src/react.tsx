/**
 * An app's one way to the api (AGENTS.md rule 3) as React reads it: the typed client, the query cache and the sdk's
 * query and mutation options, made once (the business app at start; the client site once per request on the server and
 * once in the browser) and handed down through `SdkProvider` and the router context. Stories and tests make their own
 * with a `fetch` that answers like the api.
 */
import { QueryClient } from '@tanstack/react-query'
import { createContext, use, type ReactNode } from 'react'
import { createClient, isApiError, type ClientOptions } from './client'
import { createSdk, type Sdk } from './sdk'

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

const SdkContext = createContext<Sdk | null>(null)

export function SdkProvider({ sdk, children }: { sdk: Sdk; children: ReactNode }) {
  return <SdkContext value={sdk}>{children}</SdkContext>
}

/** `useQuery(useSdk().me.get())`: the sdk the app (or a story) was started with. */
export function useSdk(): Sdk {
  const sdk = use(SdkContext)
  if (!sdk) throw new Error('useSdk() needs an <SdkProvider> above it')
  return sdk
}
