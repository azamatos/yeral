import { describe, expect, it } from 'vitest'
import { matchIn, searchServices } from './services'

const service = (id: string, name: string, description: string | null = null) => ({
  id,
  name,
  description,
  durationMin: 60,
  price: { type: 'fixed' as const, amount: 80 },
  staffIds: ['st-ayna'],
})

const groups = [
  { id: 'hair', name: 'Hair', services: [service('s1', 'Women’s haircut', 'Wash, cut and style'), service('s2', 'Men’s haircut')] },
  {
    id: 'colouring',
    name: 'Colouring',
    services: [service('s3', 'Hair colouring'), service('s4', 'Toning', 'Refreshes the colour between visits'), service('s5', 'Balayage')],
  },
  { id: 'nails', name: 'Nails', services: [service('s6', 'Manicure')] },
]

describe('where the words sit', () => {
  it('finds them case aside and points back into the text as written', () => {
    expect(matchIn('Colour correction', 'colour')).toEqual({ start: 0, end: 6 })
    expect(matchIn('Hair colouring', 'COLOUR')).toEqual({ start: 5, end: 11 })
    expect(matchIn('Hair colouring', 'xyz')).toBeNull()
  })

  it('reads accents as their letter, both ways', () => {
    expect(matchIn('Ýuwmak we guratmak', 'yuw')).toEqual({ start: 0, end: 3 })
    expect(matchIn('Saç kesmek', 'sac kes')).toEqual({ start: 0, end: 7 })
    expect(matchIn('Manikür', 'manikür')).toEqual({ start: 0, end: 7 })
    expect(matchIn('Маникюр', 'мани')).toEqual({ start: 0, end: 4 })
  })

  it('ignores an empty query and the spaces around one', () => {
    expect(matchIn('Manicure', '  ')).toBeNull()
    expect(matchIn('Gel manicure', ' mani ')).toEqual({ start: 4, end: 8 })
  })

  it('keeps the offsets right past a letter wider than one unit', () => {
    expect(matchIn('💅 Nail art', 'nail')).toEqual({ start: 3, end: 7 })
  })
})

describe('the services listed', () => {
  it('lists everything outside a search', () => {
    const r = searchServices(groups, '')
    expect(r.searching).toBe(false)
    expect(r.count).toBe(6)
    expect(r.groupCount).toBe(3)
    expect(r.groups.map((g) => g.services.length)).toEqual([2, 3, 1])
  })

  it('keeps the matches in their groups and the other groups at zero', () => {
    const r = searchServices(groups, 'colour')
    expect(r.searching).toBe(true)
    expect(r.count).toBe(2)
    expect(r.groupCount).toBe(1)
    expect(r.groups.map((g) => [g.group.id, g.services.length])).toEqual([
      ['hair', 0],
      ['colouring', 2],
      ['nails', 0],
    ])
    const [colouring, toning] = r.groups[1]!.services
    expect(colouring).toMatchObject({ service: { id: 's3' }, name: { start: 5, end: 11 }, description: null })
    expect(toning).toMatchObject({ service: { id: 's4' }, name: null, description: { start: 14, end: 20 } })
  })

  it('finds in names and descriptions alike', () => {
    expect(searchServices(groups, 'wash').groups[0]?.services.map((s) => s.service.id)).toEqual(['s1'])
    expect(searchServices(groups, 'haircut').count).toBe(2)
    expect(searchServices(groups, 'xyz')).toMatchObject({ count: 0, groupCount: 0, searching: true })
  })
})
