import { createFileRoute } from '@tanstack/react-router'
import { SettingsPlaceholder } from '@/pages/settings'

export const Route = createFileRoute('/w/$slug/settings/permissions')({ component: () => <SettingsPlaceholder section="permissions" /> })
