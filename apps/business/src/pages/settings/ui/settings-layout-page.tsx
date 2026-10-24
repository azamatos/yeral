import { Outlet, useLocation } from '@tanstack/react-router'
import { useTranslations } from 'use-intl'
import { SettingsFrame, settingsSectionOf } from '@/widgets/settings-frame'
import { WorkspacePage } from '@/widgets/workspace-shell'

/**
 * Settings around every section (B-Settings): the workspace page with the top bar «Settings», the settings' menu, and
 * the open section's route inside. The tab says which section is open: «Hours · Settings · Glow Studio».
 */
export function SettingsLayoutPage() {
  const t = useTranslations('settings')
  const open = settingsSectionOf(useLocation({ select: (l) => l.pathname }))
  return (
    <WorkspacePage title={t('title')} tabTitle={open ? `${t(`sections.${open}`)} · ${t('title')}` : undefined}>
      <SettingsFrame>
        <Outlet />
      </SettingsFrame>
    </WorkspacePage>
  )
}
