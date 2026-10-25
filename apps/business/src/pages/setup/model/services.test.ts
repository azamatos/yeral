import { describe, expect, it } from 'vitest'
import { formFromMenu, formFromStarters, servicesInput, servicesProblem, withNewRow, withStarters } from './services'

const starters = [
  {
    id: 'hair',
    name: 'Hair',
    services: [
      { id: 'womens-haircut', name: 'Women’s haircut', durationMin: 60, price: { type: 'fixed' as const, amount: 80 } },
      { id: 'hair-colouring', name: 'Hair colouring', durationMin: 120, price: { type: 'from' as const, amount: 250 } },
    ],
  },
]

describe('the services step (B-Onboarding step 5)', () => {
  it('sends the picked starters by id, a renamed one with the name as written, own services in «New services»', () => {
    let form = formFromStarters(starters)
    expect(servicesProblem(form)).toBeNull()
    form = { ...form, rows: form.rows.map((r) => (r.starter === 'womens-haircut' ? { ...r, name: ' Haircut ' } : r)) }
    form = withNewRow(form, 'New services')
    expect(servicesProblem(form)).toBe('newName')
    form = { ...form, rows: form.rows.map((r) => (r.key === 'new:0' ? { ...r, name: 'Henna' } : r)) }
    expect(servicesProblem(form)).toBe('price')
    form = { ...form, rows: form.rows.map((r) => (r.key === 'new:0' ? { ...r, price: '120' } : r)) }
    expect(servicesProblem(form)).toBeNull()
    expect(servicesInput(form, 'en')).toEqual({
      groups: [
        {
          starter: 'hair',
          services: [
            { starter: 'womens-haircut', name: { en: 'Haircut' }, durationMin: 60, priceType: 'fixed', priceAmount: 80 },
            { starter: 'hair-colouring', durationMin: 120, priceType: 'from', priceAmount: 250 },
          ],
        },
        { name: { en: 'New services' }, services: [{ name: { en: 'Henna' }, durationMin: 60, priceType: 'fixed', priceAmount: 120 }] },
      ],
    })
    // nothing picked: Continue waits, and a group without a picked row isn't sent
    const none = { ...form, rows: form.rows.map((r) => ({ ...r, on: false })) }
    expect(servicesProblem(none)).toBe('none')
    // names before prices, whatever the order of the rows
    const both = { ...form, rows: form.rows.map((r, i) => (i === 0 ? { ...r, price: '' } : i === 1 ? { ...r, name: '' } : r)) }
    expect(servicesProblem(both)).toBe('name')
    // another category: its starters, the own row kept
    const barber = [
      {
        id: 'beard',
        name: 'Beard',
        services: [{ id: 'beard-trim', name: 'Beard trim', durationMin: 30, price: { type: 'fixed' as const, amount: 40 } }],
      },
    ]
    expect(withStarters(form, barber).rows.map((r) => r.name)).toEqual(['Beard trim', 'Henna'])
  })

  it('reopens on the menu saved before: every language kept, an edit written over the app’s language only', () => {
    const menu = {
      groups: [
        {
          id: 'g1',
          name: { tk: 'Saç', en: 'Hair' },
          services: [
            {
              id: 's1',
              groupId: 'g1',
              name: { tk: 'Aýal saç kesimi', en: 'Women’s haircut' },
              description: null,
              durationMin: 60,
              priceType: 'fixed' as const,
              priceAmount: 80,
              bufferMin: null,
              online: true,
              staffIds: [],
              futureBookings: 0,
            },
          ],
        },
        { id: 'g2', name: { en: 'New services' }, services: [] },
        { id: 'g3', name: { en: 'New services' }, services: [] },
      ],
    }
    let form = formFromMenu(menu, 'en', 'New services')
    // unchanged: by id only, so it keeps every language and what Settings added
    expect(servicesInput(form, 'en').groups[0]).toEqual({
      id: 'g1',
      services: [{ id: 's1', durationMin: 60, priceType: 'fixed', priceAmount: 80 }],
    })
    form = { ...form, rows: form.rows.map((r) => ({ ...r, name: 'Haircut' })) }
    // the market's languages only: the catalogue's others aren't the business's to send
    expect(servicesInput(form, 'en').groups[0]!.services[0]!.name).toEqual({ en: 'Haircut' })
    // a new service joins the menu's «New services», no second one
    expect(
      withNewRow(form, 'New services')
        .groups.filter((g) => g.key === 'own')
        .map((g) => g.id),
    ).toEqual(['g2'])
  })

  it('names a group as the owner writes it: the own one always, a starter or saved one only when changed', () => {
    let form = withNewRow(formFromStarters(starters), 'New services')
    form = { ...form, rows: form.rows.map((r) => (r.key === 'new:0' ? { ...r, name: 'Henna', price: '120' } : r)) }
    // the own group renamed, the starter group left: the starter by id only
    form = { ...form, groups: form.groups.map((g) => (g.key === 'own' ? { ...g, name: ' Brows ' } : g)) }
    expect(servicesInput(form, 'en').groups.map(({ services: _, ...g }) => g)).toEqual([{ starter: 'hair' }, { name: { en: 'Brows' } }])
    // a starter group renamed goes with its new name
    const starter = { ...form, groups: form.groups.map((g) => (g.starter ? { ...g, name: 'Hair and colour' } : g)) }
    expect(servicesInput(starter, 'en').groups[0]).toMatchObject({ starter: 'hair', name: { en: 'Hair and colour' } })
    // a group with a picked row needs a name; an empty one of nothing picked doesn't hold Continue
    const blank = { ...form, groups: form.groups.map((g) => (g.key === 'own' ? { ...g, name: ' ' } : g)) }
    expect(servicesProblem(blank)).toBe('groupName')
    expect(servicesProblem({ ...blank, rows: blank.rows.map((r) => (r.group === 'own' ? { ...r, on: false } : r)) })).toBeNull()
    // a saved group renamed: by id, over the app's language, the market's languages kept
    const cut = {
      id: 's1',
      groupId: 'g1',
      name: { en: 'Haircut' },
      description: null,
      durationMin: 60,
      priceType: 'fixed' as const,
      priceAmount: 80,
      bufferMin: null,
      online: true,
      staffIds: [],
      futureBookings: 0,
    }
    const saved = formFromMenu({ groups: [{ id: 'g1', name: { tk: 'Saç', en: 'Hair' }, services: [cut] }] }, 'en', 'New services')
    expect(servicesInput(saved, 'en').groups[0]).not.toHaveProperty('name')
    const renamed = { ...saved, groups: saved.groups.map((g) => ({ ...g, name: 'Hair and colour' })) }
    expect(servicesInput(renamed, 'en').groups[0]).toMatchObject({ id: 'g1', name: { en: 'Hair and colour' } })
    // the own group named «Brows» stays the own group after a save, so new services keep going there
    const back = formFromMenu({ groups: [{ id: 'g9', name: { en: 'Brows' }, services: [] }] }, 'en', 'Brows')
    expect(withNewRow(back, 'New services').groups.map((g) => [g.key, g.id])).toEqual([['own', 'g9']])
  })
})
