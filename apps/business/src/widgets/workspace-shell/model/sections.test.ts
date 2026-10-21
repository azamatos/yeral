import { describe, expect, it } from 'vitest'
import { canOpen, placeFor, sameSectionIn, sectionOf, sectionsFor } from './sections'

const AYNA = {
  items: [
    { slug: 'glow-studio', level: 'specialist' as const },
    { slug: 'ayna-studio', level: 'owner' as const },
  ],
  current: 'ayna-studio',
}

describe('the workspace sections', () => {
  it('owners and admins see all five; a specialist has no settings (removed, not disabled)', () => {
    expect(sectionsFor('owner')).toEqual(['calendar', 'bookings', 'clients', 'reviews', 'settings'])
    expect(sectionsFor('admin')).toEqual(['calendar', 'bookings', 'clients', 'reviews', 'settings'])
    expect(sectionsFor('specialist')).toEqual(['calendar', 'bookings', 'clients', 'reviews'])
    expect(canOpen('specialist', 'settings')).toBe(false)
  })

  it('reads the section from an address', () => {
    expect(sectionOf('/w/glow-studio/settings/hours')).toBe('settings')
    expect(sectionOf('/w/glow-studio/clients')).toBe('clients')
    expect(sectionOf('/w/glow-studio')).toBeNull()
    expect(sectionOf('/login')).toBeNull()
  })

  it('switching keeps the section where the level there has it, never a part of the workspace left', () => {
    expect(sameSectionIn('/w/glow-studio/clients/c-12', { slug: 'glow-nails', level: 'owner' })).toEqual({
      slug: 'glow-nails',
      section: 'clients',
    })
    expect(sameSectionIn('/w/glow-studio', { slug: 'glow-nails', level: 'owner' })).toEqual({ slug: 'glow-nails', section: 'calendar' })
    // from her own studio's settings into the studio where she's a specialist: its calendar, not a refusal
    expect(sameSectionIn('/w/ayna-studio/settings', { slug: 'glow-studio', level: 'specialist' })).toEqual({
      slug: 'glow-studio',
      section: 'calendar',
    })
  })
})

describe('where an address goes (design §27.1)', () => {
  it('opens a workspace of theirs at a section their level has', () => {
    expect(placeFor('/w/glow-studio/clients', 'glow-studio', AYNA)).toEqual({ open: true })
    expect(placeFor('/w/ayna-studio/settings/hours', 'ayna-studio', AYNA)).toEqual({ open: true })
  })

  it('a section the level hasn’t got: that workspace’s calendar, with the toast', () => {
    expect(placeFor('/w/glow-studio/settings', 'glow-studio', AYNA)).toEqual({
      to: { slug: 'glow-studio', section: 'calendar' },
      closed: true,
    })
  })

  it('a workspace that isn’t theirs: the last used one, at the same section where they may, with the toast', () => {
    expect(placeFor('/w/bag-kafe/clients', 'bag-kafe', AYNA)).toEqual({ to: { slug: 'ayna-studio', section: 'clients' }, closed: true })
    expect(placeFor('/w/bag-kafe/settings', 'bag-kafe', { ...AYNA, current: 'glow-studio' })).toEqual({
      to: { slug: 'glow-studio', section: 'calendar' },
      closed: true,
    })
    // never opened one: the first
    expect(placeFor('/w/bag-kafe/reviews', 'bag-kafe', { ...AYNA, current: null })).toEqual({
      to: { slug: 'glow-studio', section: 'reviews' },
      closed: true,
    })
  })

  it('no workspace at all: the sign-in, which says what’s next', () => {
    expect(placeFor('/w/bag-kafe/calendar', 'bag-kafe', { items: [], current: null })).toEqual({ signIn: true })
  })
})
