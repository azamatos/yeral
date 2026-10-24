import { createFileRoute } from '@tanstack/react-router'
import { SettingsPlaceholder } from '@/pages/settings'

export const Route = createFileRoute('/w/$slug/settings/hours')({ component: () => <SettingsPlaceholder section="hours" /> })
