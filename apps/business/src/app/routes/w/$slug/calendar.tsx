import { createFileRoute } from '@tanstack/react-router'
import { SectionPage } from '@/pages/section'

export const Route = createFileRoute('/w/$slug/calendar')({ component: () => <SectionPage section="calendar" /> })
