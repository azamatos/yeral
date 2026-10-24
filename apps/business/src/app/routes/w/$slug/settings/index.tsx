import { createFileRoute, redirect } from '@tanstack/react-router'
import { FIRST_SETTINGS_SECTION } from '@/widgets/settings-frame'

// Settings opens its first section
export const Route = createFileRoute('/w/$slug/settings/')({
  beforeLoad: ({ params }) => {
    redirect({ to: `/w/$slug/settings/${FIRST_SETTINGS_SECTION}`, params, replace: true, throw: true })
  },
})
