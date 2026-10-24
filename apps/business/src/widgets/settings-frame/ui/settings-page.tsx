import { SettingsPane, SettingsPaneHeader } from '@yeral/ui/settings-layout'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import type { SettingsSection } from '../model/sections'

/**
 * One section of Settings, inside the <SettingsFrame> (B-Settings `.pane`): its header (the menu's name as an h2, the
 * `lead` under it, an `action` on the right such as «See your page») and its groups (`<SettingsSection>` from
 * `@yeral/ui/settings-layout`), up to 720 wide. A form section puts its <SaveBar> last in `children`: it sticks to the
 * bottom of the pane while there are changes. `aside` sits beside the pane where there's room and under it where
 * there isn't (the booking rules' client preview).
 */
export function SettingsPage({
  section,
  lead,
  action,
  aside,
  children,
}: {
  section: SettingsSection
  lead?: ReactNode
  action?: ReactNode
  aside?: ReactNode
  children?: ReactNode
}) {
  const t = useTranslations('settings.sections')
  return (
    <>
      <SettingsPane>
        <SettingsPaneHeader title={t(section)} lead={lead} action={action} />
        {children}
      </SettingsPane>
      {aside}
    </>
  )
}
