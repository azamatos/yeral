import type { Sdk } from '@yeral/sdk'
import { createContext, use, type ReactNode } from 'react'

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
