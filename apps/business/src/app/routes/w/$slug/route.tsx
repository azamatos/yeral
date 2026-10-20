import { createFileRoute, redirect } from '@tanstack/react-router'
import { sameSectionIn, sectionClosed, WorkspaceShell } from '@/widgets/workspace-shell'

/**
 * Every workspace page (design §27.1: addresses always carry the workspace) needs someone signed in who works there. A
 * workspace that isn't theirs opens their last used one at the same section, with "This section is closed to you";
 * with none at all, the sign-in says what's next (an invite, a setup, no workspace yet).
 */
export const Route = createFileRoute('/w/$slug')({
  beforeLoad: async ({ context, params, location, preload }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get())
    if (!me) redirect({ to: '/login', replace: true, throw: true })
    const { items, current } = await context.queryClient.ensureQueryData(context.sdk.team.workspaces())
    if (items.some((w) => w.slug === params.slug)) return
    const home = items.find((w) => w.slug === current) ?? items[0]
    if (!home) redirect({ to: '/login', replace: true, throw: true })
    else {
      if (!preload) sectionClosed()
      const { section, slug } = sameSectionIn(location.pathname, home.slug)
      redirect({ to: `/w/$slug/${section}`, params: { slug }, replace: true, throw: true })
    }
  },
  component: WorkspaceShell,
})
