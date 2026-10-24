import { describe, expect, it } from 'vitest'
import { FIRST_SETTINGS_SECTION, settingsSectionOf } from './sections'

describe('settings sections (B-Settings)', () => {
  it('reads the open section from the address', () => {
    expect(settingsSectionOf('/w/glow-studio/settings/hours')).toBe('hours')
    expect(settingsSectionOf('/w/glow-studio/settings/link?x=1')).toBe('link')
    // a deeper part (a team member) still belongs to its section
    expect(settingsSectionOf('/w/glow-studio/settings/team/m-1')).toBe('team')
  })

  it('finds none outside a section', () => {
    expect(settingsSectionOf('/w/glow-studio/settings')).toBeNull()
    expect(settingsSectionOf('/w/glow-studio/settings/billing')).toBeNull()
    expect(settingsSectionOf('/w/glow-studio/calendar')).toBeNull()
  })

  it('opens Business profile first', () => {
    expect(FIRST_SETTINGS_SECTION).toBe('profile')
  })
})
