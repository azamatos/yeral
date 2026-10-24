import { createFileRoute } from '@tanstack/react-router'
import { SettingsServicesPage } from '@/pages/settings-services'

export const Route = createFileRoute('/w/$slug/settings/services')({ component: SettingsServicesPage })
