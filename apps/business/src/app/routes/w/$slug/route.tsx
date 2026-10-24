import { createFileRoute, redirect } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { placeFor, sectionClosed, targetRoute, WorkspaceShell } from '@/widgets/workspace-shell'

/**
 * Every workspace page (design §27.1: addresses always carry the workspace) needs someone signed in who works there, at
 * a section their level has (`placeFor`: else their last used workspace or the calendar, with "This section is closed
 * to you"; with no workspace, the sign-in says what's next). A workspace missing from the list held in memory is asked
 * for again before it's refused (an invite accepted on another device). A redirect is thrown, so it passes the catch.
 */
export const Route = createFileRoute('/w/$slug')({
  beforeLoad: async ({ context: { queryClient, sdk }, params, location, preload }) => {
    const signIn = () => redirect({ to: '/login', replace: true, throw: true })
    try {
      const me = await queryClient.ensureQueryData(sdk.me.get())
      if (!me) return signIn()
      let workspaces = await queryClient.ensureQueryData(sdk.team.workspaces())
      if (!workspaces.items.some((w) => w.slug === params.slug))
        workspaces = await queryClient.fetchQuery({ ...sdk.team.workspaces(), staleTime: 0 })
      const place = placeFor(location.pathname, params.slug, workspaces)
      if ('signIn' in place) return signIn()
      if ('to' in place) {
        if (!preload) sectionClosed()
        redirect({ to: targetRoute(place.to), params: { slug: place.to.slug }, replace: true, throw: true })
      }
    } catch (error) {
      // the session ended meanwhile: the sdk forgets the person, the sign-in takes over
      if (isApiError(error, 'unauthorized')) signIn()
      throw error
    }
  },
  component: WorkspaceShell,
})
