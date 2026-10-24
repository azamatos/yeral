import { createFileRoute } from '@tanstack/react-router'
import { SettingsLayoutPage } from '@/pages/settings'

// Settings' frame around every section (/w/{slug}/settings/{section}); a Specialist never gets here (the parent's placeFor)
export const Route = createFileRoute('/w/$slug/settings')({ component: SettingsLayoutPage })
