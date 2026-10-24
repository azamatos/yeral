import { createFileRoute } from '@tanstack/react-router'
import { SettingsPlaceholder } from '@/pages/settings'

export const Route = createFileRoute('/w/$slug/settings/team')({ component: () => <SettingsPlaceholder section="team" /> })
