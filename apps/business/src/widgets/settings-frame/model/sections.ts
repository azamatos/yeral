/**
 * Settings' sections (design §28.5, B-Settings): the list itself is `@/shared/config`'s, for the shell's switcher too.
 * A Specialist has no Settings at all (the shell's `placeFor`); an Admin sees every section, Team and Permissions
 * read-only (each section says so itself).
 */
import { SETTINGS_SECTIONS, type SettingsSection } from '@/shared/config'

export { SETTINGS_SECTIONS, type SettingsSection }

/** `/w/{slug}/settings` opens this one. */
export const FIRST_SETTINGS_SECTION: SettingsSection = SETTINGS_SECTIONS[0]

/** The section an address is in (`/w/glow-studio/settings/hours` → `hours`), if any. */
export function settingsSectionOf(pathname: string): SettingsSection | null {
  const part = /^\/w\/[^/]+\/settings\/([^/?#]+)/.exec(pathname)?.[1]
  return SETTINGS_SECTIONS.find((s) => s === part) ?? null
}
