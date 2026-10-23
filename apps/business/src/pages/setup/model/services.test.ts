import { describe, expect, it } from 'vitest'
import { formFromMenu, formFromStarters, servicesInput, servicesProblem, withNewRow } from './services'

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
    expect(servicesProblem(form)).toBe('name')
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
      ],
    }
    let form = formFromMenu(menu, 'en', 'New services')
    // unchanged: by id only, so it keeps every language and what Settings added
    expect(servicesInput(form, 'en').groups[0]).toEqual({
      id: 'g1',
      services: [{ id: 's1', durationMin: 60, priceType: 'fixed', priceAmount: 80 }],
    })
    form = { ...form, rows: form.rows.map((r) => ({ ...r, name: 'Haircut' })) }
    expect(servicesInput(form, 'en').groups[0]!.services[0]!.name).toEqual({ tk: 'Aýal saç kesimi', en: 'Haircut' })
    // a new service joins the menu's «New services», no second one
    expect(withNewRow(form, 'New services').groups.filter((g) => g.key === 'own')).toHaveLength(1)
  })
})
