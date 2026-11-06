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

/** How the sign-in's code will come (`GET /v1/auth/mode`, ADR 0029): the phone step's caption and the code step's lead say so ahead. */
export function useCodeDelivery(): 'screen' | 'sms' | 'telegram' {
  const sdk = useSdk()
  return useQuery(sdk.auth.mode()).data?.delivery ?? 'sms'
}
