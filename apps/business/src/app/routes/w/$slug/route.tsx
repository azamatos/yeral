import { createFileRoute, redirect } from '@tanstack/react-router'

// every workspace page needs someone signed in (design §27.1: addresses always carry the workspace)
export const Route = createFileRoute('/w/$slug')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get())
    if (!me) redirect({ to: '/login', replace: true, throw: true })
  },
})
