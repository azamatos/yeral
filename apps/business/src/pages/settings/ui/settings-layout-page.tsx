import { Outlet, useLocation } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { SettingsFrame, settingsSectionOf } from '@/widgets/settings-frame'
import { WorkspacePage } from '@/widgets/workspace-shell'

/**
 * Settings around every section (B-Settings): the workspace page with the top bar «Settings» (the sidebar's name),
 * the settings' menu, and the open section's route inside. The tab says which section is open: «Hours · Settings ·
 * Glow Studio». «Settings» takes the focus once, when Settings opens; a section opened from the menu takes it on its
 * own name (`SettingsPage`).
 */
export function SettingsLayoutPage() {
  const t = useTranslations()
  const title = t('shell.sections.settings')
  const open = settingsSectionOf(useLocation({ select: (l) => l.pathname }))
  return (
    <WorkspacePage title={title} tabTitle={open ? [t(`settings.sections.${open}`), title] : undefined} focusKey="settings">
      <SettingsFrame>
        <Outlet />
      </SettingsFrame>
    </WorkspacePage>
  )
}
