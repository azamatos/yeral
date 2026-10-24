/**
 * Settings' sections (design §28.5, B-Settings, DS-Business «Settings navigation · final list»), each at
 * `/w/{slug}/settings/{section}`, in the menu's order. A Specialist has no Settings at all (the shell's `placeFor`); an
 * Admin sees every section, Team and Permissions read-only (each section says so itself).
 */
export const SETTINGS_SECTIONS = ['profile', 'rules', 'hours', 'services', 'team', 'permissions', 'link'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

/** `/w/{slug}/settings` opens this one. */
export const FIRST_SETTINGS_SECTION: SettingsSection = SETTINGS_SECTIONS[0]

/** The section an address is in (`/w/glow-studio/settings/hours` → `hours`), if any. */
export function settingsSectionOf(pathname: string): SettingsSection | null {
  const part = /^\/w\/[^/]+\/settings\/([^/?#]+)/.exec(pathname)?.[1]
  return SETTINGS_SECTIONS.find((s) => s === part) ?? null
}
