import { createFileRoute } from '@tanstack/react-router'
import { SettingsPermissionsPage } from '@/pages/settings-permissions'

export const Route = createFileRoute('/w/$slug/settings/permissions')({ component: SettingsPermissionsPage })
