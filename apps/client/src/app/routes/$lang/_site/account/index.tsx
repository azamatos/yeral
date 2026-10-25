import { createFileRoute, redirect } from '@tanstack/react-router'

// the account's own address opens My bookings (client spec: «/account opens bookings»)
export const Route = createFileRoute('/$lang/_site/account/')({
  beforeLoad: ({ params }) => {
    redirect({ to: '/$lang/account/bookings', params, replace: true, throw: true })
  },
})
