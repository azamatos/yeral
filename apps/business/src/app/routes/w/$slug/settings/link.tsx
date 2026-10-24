import { createFileRoute } from '@tanstack/react-router'
import { SettingsLinkPage } from '@/pages/settings-link'

export const Route = createFileRoute('/w/$slug/settings/link')({ component: SettingsLinkPage })
