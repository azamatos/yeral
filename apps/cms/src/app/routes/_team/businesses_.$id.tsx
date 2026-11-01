import { createFileRoute } from '@tanstack/react-router'
import { BusinessPage } from '@/pages/business'

export const Route = createFileRoute('/_team/businesses_/$id')({ component: Page })

function Page() {
  const { id } = Route.useParams()
  return <BusinessPage id={id} />
}
