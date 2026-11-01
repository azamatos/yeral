import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '@/pages/setup'

export const Route = createFileRoute('/setup/$token')({ component: Page })

function Page() {
  const { token } = Route.useParams()
  return <SetupPage token={token} />
}
