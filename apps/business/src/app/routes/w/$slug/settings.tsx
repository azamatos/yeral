import { createFileRoute } from '@tanstack/react-router'
import { SectionPage } from '@/pages/section'

// a Specialist's address here goes to the calendar in `/w/$slug` (removed, not disabled)
export const Route = createFileRoute('/w/$slug/settings')({ component: () => <SectionPage section="settings" /> })
