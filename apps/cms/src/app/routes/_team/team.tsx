import { createFileRoute } from '@tanstack/react-router'
import { TeamMembersPage } from '@/pages/team'

export const Route = createFileRoute('/_team/team')({ component: TeamMembersPage })
