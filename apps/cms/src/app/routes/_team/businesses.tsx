import { createFileRoute } from '@tanstack/react-router'
import { BusinessesPage, businessesSearch } from '@/pages/businesses'

export const Route = createFileRoute('/_team/businesses')({ validateSearch: businessesSearch, component: Page })

function Page() {
  const { view, q } = Route.useSearch()
  return <BusinessesPage key={q ?? ''} view={view} q={q} />
}
