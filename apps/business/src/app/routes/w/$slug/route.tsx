import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate, Outlet, redirect } from '@tanstack/react-router'
import { useSdk } from '@/shared/api'

// every workspace page needs someone signed in (design §27.1: addresses always carry the workspace)
export const Route = createFileRoute('/w/$slug')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get())
    if (!me) redirect({ to: '/login', replace: true, throw: true })
  },
  component: SignedIn,
})

/** The session ended while a workspace page was open (the sdk forgets the person on a 401): back to the sign-in. */
function SignedIn() {
  const me = useQuery(useSdk().me.get())
  if (me.data === null) return <Navigate to="/login" replace />
  return <Outlet />
}
