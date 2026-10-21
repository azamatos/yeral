import { createFileRoute, redirect } from '@tanstack/react-router'

// the account's own address opens its one page so far (My bookings takes it with P4 slice 3)
export const Route = createFileRoute('/$lang/_site/account/')({
  beforeLoad: ({ params }) => {
    redirect({ to: '/$lang/account/profile', params, replace: true, throw: true })
  },
})
