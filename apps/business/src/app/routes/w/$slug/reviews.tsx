import { createFileRoute } from '@tanstack/react-router'
import { ReviewsPage, reviewsSearch } from '@/pages/reviews'

export const Route = createFileRoute('/w/$slug/reviews')({ validateSearch: reviewsSearch, component: ReviewsPage })
