/**
 * The workspace's sections (design §27.1, §28.1; B-Shell): Calendar · Bookings · Clients · Reviews · Settings, each at
 * `/w/{slug}/{section}`. What a level can't use is removed, not disabled (design §1): a Specialist has no Settings (the
 * fixed permission table, `@yeral/domain/permissions`). Opening a removed one by its address goes to the calendar.
 */
import { PERMISSION_TABLE, type Level } from '@yeral/domain/permissions'

export const SECTIONS = ['calendar', 'bookings', 'clients', 'reviews', 'settings'] as const
export type Section = (typeof SECTIONS)[number]

/** The sections a level sees, in the sidebar's order. */
export function sectionsFor(level: Level): Section[] {
  return SECTIONS.filter((section) => section !== 'settings' || PERMISSION_TABLE[level].settings !== 'none')
}

export const canOpen = (level: Level, section: Section): boolean => sectionsFor(level).includes(section)

/** The section an address is in (`/w/glow-studio/settings/hours` → `settings`), if any. */
export function sectionOf(pathname: string): Section | null {
  const part = /^\/w\/[^/]+\/([^/?#]+)/.exec(pathname)?.[1]
  return SECTIONS.find((s) => s === part) ?? null
}

/**
 * The same place in another workspace: switching keeps the section (`/w/glow-studio/clients` →
 * `/w/glow-nails/clients`, design §27.1). Deeper parts (a client's card) belong to the workspace left, so only the
 * section is kept; the calendar when there's none.
 */
export function sameSectionIn(pathname: string, slug: string): { section: Section; slug: string } {
  return { slug, section: sectionOf(pathname) ?? 'calendar' }
}
