import { createFileRoute, redirect } from '@tanstack/react-router'
import { SectionPage } from '@/pages/section'
import { canOpen, sectionClosed } from '@/widgets/workspace-shell'

// Settings is the owner's and the admins' (a Specialist has none: removed, not disabled); its address alone goes to the
// calendar with "This section is closed to you" (B-Shell)
export const Route = createFileRoute('/w/$slug/settings')({
  beforeLoad: async ({ context, params, preload }) => {
    const { items } = await context.queryClient.ensureQueryData(context.sdk.team.workspaces())
    const level = items.find((w) => w.slug === params.slug)?.level
    if (!level || canOpen(level, 'settings')) return
    if (!preload) sectionClosed()
    redirect({ to: '/w/$slug/calendar', params, replace: true, throw: true })
  },
  component: () => <SectionPage section="settings" />,
})
