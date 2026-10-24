import { createFileRoute } from '@tanstack/react-router'
import { SettingsHoursPage } from '@/pages/settings-hours'

export const Route = createFileRoute('/w/$slug/settings/hours')({ component: SettingsHoursPage })
