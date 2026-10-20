import { useMutation, useQueryClient } from '@tanstack/react-query'
import { keys } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'

/**
 * Signing out, and a session that ended on its own (a 401): nothing of the last person's stays in the cache but `me`,
 * now null. The sdk's `auth.logout` keeps the team's queries (workspaces, invites) and `auth.verify` doesn't reset
 * them, so the app drops them here until the sdk does.
 */
export function useSignOut() {
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const logout = useMutation(sdk.auth.logout())
  const forget = () => {
    queryClient.setQueryData(keys.me(), null)
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me()[0] })
  }
  return {
    signOut: ({ onDone, onFailed }: { onDone?: () => void; onFailed?: (error: unknown) => void } = {}) =>
      logout.mutate(undefined, {
        onSuccess: () => {
          forget()
          onDone?.()
        },
        onError: onFailed,
      }),
    signingOut: logout.isPending,
    /** The api said the session is over: the sign-in again. */
    sessionEnded: forget,
  }
}
