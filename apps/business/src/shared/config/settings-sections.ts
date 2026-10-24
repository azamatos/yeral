/**
 * Settings' sections (design §28.5, B-Settings, DS-Business «Settings navigation · final list»), each at
 * `/w/{slug}/settings/{section}`, in the menu's order. Every workspace has the same ones, so switching workspaces keeps
 * the one open.
 */
export const SETTINGS_SECTIONS = ['profile', 'rules', 'hours', 'services', 'team', 'permissions', 'link'] as const
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number]

export const isSettingsSection = (part: string | undefined): part is SettingsSection =>
  (SETTINGS_SECTIONS as readonly string[]).includes(part ?? '')
