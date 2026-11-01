import { createFileRoute } from '@tanstack/react-router'
import { TeamShell } from '@/widgets/team-shell'

export const Route = createFileRoute('/_team')({ component: TeamShell })
