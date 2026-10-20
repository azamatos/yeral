import { createFileRoute } from '@tanstack/react-router'
import { SectionPage } from '@/pages/section'

export const Route = createFileRoute('/w/$slug/reviews')({ component: () => <SectionPage section="reviews" /> })
