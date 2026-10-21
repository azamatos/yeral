import { useQuery } from '@tanstack/react-query'
import { useSdk } from '@yeral/sdk/react'

/**
 * Whether the sign-in shows its code on the screen (the first launch, book Q-036, F-200), from `GET /v1/auth/mode`:
 * the phone step then says it's a demo. Unknown while loading or after an error (no note: a wrong demo note would tell a
 * real launch's people to type a made-up number). The page or modal calls it first, so it's there with the phone step.
 */
export function useCodeOnScreen(): boolean {
  const sdk = useSdk()
  return useQuery(sdk.auth.mode()).data?.codeOnScreen ?? false
}
