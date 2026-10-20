import { describe, expect, it } from 'vitest'
import { canOpen, sameSectionIn, sectionOf, sectionsFor } from './sections'

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

  it('switching keeps the section, never a part that belongs to the workspace left', () => {
    expect(sameSectionIn('/w/glow-studio/clients/c-12', 'glow-nails')).toEqual({ slug: 'glow-nails', section: 'clients' })
    expect(sameSectionIn('/w/glow-studio', 'glow-nails')).toEqual({ slug: 'glow-nails', section: 'calendar' })
  })
})
