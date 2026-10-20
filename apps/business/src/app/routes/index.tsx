import { createFileRoute, redirect } from '@tanstack/react-router'

// the landing (B-Landing) comes later; until then the app starts at the sign-in, which sends a signed-in person on
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    redirect({ to: '/login', replace: true, throw: true })
  },
})
