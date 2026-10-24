import { SettingsPage, type SettingsSection } from '@/widgets/settings-frame'

/**
 * Stands in for a settings section until slice 2 builds it: its header in the frame and an empty pane, so every item in
 * the menu leads somewhere (as `SectionPage` does for the workspace's sections).
 */
export function SettingsPlaceholder({ section }: { section: SettingsSection }) {
  return <SettingsPage section={section} />
}
