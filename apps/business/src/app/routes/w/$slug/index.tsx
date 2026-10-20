import { createFileRoute, redirect } from '@tanstack/react-router'

// a workspace's own address opens its calendar
export const Route = createFileRoute('/w/$slug/')({
  beforeLoad: ({ params }) => {
    redirect({ to: '/w/$slug/calendar', params, replace: true, throw: true })
  },
})
