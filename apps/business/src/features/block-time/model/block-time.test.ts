import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { blockBody, blockFormOf, blockProblems, canSend, nextSlot, occurrences, timeOptions, withDate, withStart } from './block-time'

const DAY = '2026-10-14'
const slot = { staffId: 's', date: DAY, start: 870 }

describe('block time', () => {
  it('opens an hour from the slot, no later than the grid’s end, with a repeat’s last day four weeks on', () => {
    expect(blockFormOf(slot, 1260)).toMatchObject({ start: 870, end: 930, kind: null, repeat: 'none', until: '2026-11-11' })
    expect(blockFormOf({ ...slot, start: 1245 }, 1260)).toMatchObject({ start: 1245, end: 1260 })
  })

  it('offers the quarter hours on the grid’s hours and keeps the end after the start', () => {
    expect(timeOptions(9, 10)).toEqual({ starts: [540, 555, 570, 585], ends: [555, 570, 585, 600] })
    const form = blockFormOf(slot, 1260)
    expect(withStart(form, 900)).toMatchObject({ start: 900, end: 930 })
    expect(withStart(form, 960)).toMatchObject({ start: 960, end: 975 })
    expect(withDate(form, '2026-10-20').until).toBe('2026-11-11')
    expect(withDate(form, '2026-12-01').until).toBe('2026-12-29')
  })

  it('counts the days a repeat lands on', () => {
    expect(occurrences({ date: DAY, repeat: 'none', until: '2026-11-30' })).toBe(1)
    expect(occurrences({ date: DAY, repeat: 'weekly', until: '2026-11-30' })).toBe(7)
    expect(occurrences({ date: DAY, repeat: 'daily', until: '2026-10-20' })).toBe(7)
    expect(occurrences({ date: DAY, repeat: 'daily', until: DAY })).toBe(1)
  })

  it('names what keeps the form from sending', () => {
    const now = epochOf(DAY, 600)
    const form = { ...blockFormOf(slot, 1260), kind: 'training' as const }
    expect(blockProblems(form, now)).toEqual({ time: null, until: false, reason: false })
    expect(canSend(blockProblems(form, now))).toBe(true)
    expect(blockProblems({ ...form, end: 870 }, now).time).toBe('order')
    expect(blockProblems({ ...form, start: 480, end: 600 }, now).time).toBe('past')
    expect(blockProblems({ ...form, kind: null }, now).reason).toBe(true)
    expect(blockProblems({ ...form, kind: 'other', text: ' ' }, now).reason).toBe(true)
    expect(blockProblems({ ...form, kind: 'other', text: 'Dentist' }, now).reason).toBe(false)
    expect(blockProblems({ ...form, repeat: 'weekly', until: DAY }, now).until).toBe(true)
    expect(blockProblems({ ...form, repeat: 'weekly', until: '2027-10-20' }, now).until).toBe(true)
    expect(blockProblems({ ...form, repeat: 'weekly', until: '2026-11-30' }, now).until).toBe(false)
    expect(nextSlot(601)).toBe(615)
    expect(nextSlot(615)).toBe(615)
  })

  it('sends the chips as the kind, Other in words and the repeat with its last day', () => {
    const form = { ...blockFormOf(slot, 1260), kind: 'training' as const }
    expect(blockBody(form)).toEqual({ staffId: 's', date: DAY, start: 870, end: 930, kind: 'training' })
    expect(blockBody({ ...form, kind: 'other', text: ' Dentist ' })).toMatchObject({ kind: 'other', reason: 'Dentist' })
    expect(blockBody({ ...form, repeat: 'weekly', until: '2026-11-30' })).toMatchObject({ repeat: 'weekly', repeatUntil: '2026-11-30' })
  })
})
