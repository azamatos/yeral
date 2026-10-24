import { createFileRoute } from '@tanstack/react-router'
import { SettingsProfilePage } from '@/pages/settings-profile'

export const Route = createFileRoute('/w/$slug/settings/profile')({ component: SettingsProfilePage })
