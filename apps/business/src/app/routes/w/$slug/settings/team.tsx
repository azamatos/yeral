import { createFileRoute } from '@tanstack/react-router'
import { SettingsTeamPage } from '@/pages/settings-team'

export const Route = createFileRoute('/w/$slug/settings/team')({ component: SettingsTeamPage })
