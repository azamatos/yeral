/**
 * The workspace's sections (design §27.1, §28.1; B-Shell): Calendar · Bookings · Clients · Reviews · Settings, each at
 * `/w/{slug}/{section}`. What a level can't use is removed, not disabled (design §1): a Specialist has no Settings (the
 * fixed permission table, `@yeral/domain/permissions`). One resolver says where any address goes, so the switcher, a
 * foreign workspace's address and a section the level hasn't got agree.
 */
import { levelCan, type Level } from '@yeral/domain/permissions'

export const SECTIONS = ['calendar', 'bookings', 'clients', 'reviews', 'settings'] as const
export type Section = (typeof SECTIONS)[number]

/** The sections a level sees, in the sidebar's order. */
export function sectionsFor(level: Level): Section[] {
  return SECTIONS.filter((section) => section !== 'settings' || levelCan(level, 'settings'))
}

export const canOpen = (level: Level, section: Section): boolean => sectionsFor(level).includes(section)

/** The section an address is in (`/w/glow-studio/settings/hours` → `settings`), if any. */
export function sectionOf(pathname: string): Section | null {
  const part = /^\/w\/[^/]+\/([^/?#]+)/.exec(pathname)?.[1]
  return SECTIONS.find((s) => s === part) ?? null
}

interface Place {
  slug: string
  level: Level
}

/**
 * The same place in another workspace: switching keeps the section (`/w/glow-studio/clients` →
 * `/w/glow-nails/clients`, design §27.1) when the person's level there has it, else the calendar. Deeper parts (a
 * client's card) belong to the workspace left, so only the section is kept; Settings keeps its section too (every
 * workspace has the same ones: `settings/hours` → `settings/hours`), but nothing under it (a team member).
 */
export function sameSectionIn(pathname: string, to: Place): { slug: string; section: Section; part?: string } {
  const section = sectionOf(pathname)
  if (!section || !canOpen(to.level, section)) return { slug: to.slug, section: 'calendar' }
  const part = section === 'settings' ? /^\/w\/[^/]+\/settings\/([^/?#]+)/.exec(pathname)?.[1] : undefined
  return part ? { slug: to.slug, section, part } : { slug: to.slug, section }
}

/**
 * Where an address under `/w/{slug}` goes for this person: on (`open`); to another place with "This section is closed
 * to you" (a workspace that isn't theirs → their last used one, else the first, at the same section where they may;
 * a section their level hasn't got → that workspace's calendar); or to the sign-in when they have no workspace.
 */
export function placeFor(
  pathname: string,
  slug: string,
  workspaces: { items: readonly Place[]; current: string | null },
): { open: true } | { to: { slug: string; section: Section }; closed: true } | { signIn: true } {
  const here = workspaces.items.find((w) => w.slug === slug)
  if (here) {
    const section = sectionOf(pathname)
    if (!section || canOpen(here.level, section)) return { open: true }
    return { to: { slug, section: 'calendar' }, closed: true }
  }
  const home = workspaces.items.find((w) => w.slug === workspaces.current) ?? workspaces.items[0]
  return home ? { to: sameSectionIn(pathname, home), closed: true } : { signIn: true }
}
