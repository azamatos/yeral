import { createFileRoute } from '@tanstack/react-router'
import { SectionPage } from '@/pages/section'

export const Route = createFileRoute('/_team/team')({ component: () => <SectionPage section="team" /> })
