import { createFileRoute } from '@tanstack/react-router'
import { SettingsRulesPage } from '@/pages/settings-rules'

export const Route = createFileRoute('/w/$slug/settings/rules')({ component: SettingsRulesPage })
