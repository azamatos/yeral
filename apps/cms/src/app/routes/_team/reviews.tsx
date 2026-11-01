import { createFileRoute } from '@tanstack/react-router'
import { ReviewsPage, reviewsSearch } from '@/pages/reviews'

export const Route = createFileRoute('/_team/reviews')({ validateSearch: reviewsSearch, component: Page })

function Page() {
  const { view } = Route.useSearch()
  return <ReviewsPage view={view} />
}
