import { describe, expect, it } from 'vitest'
import { addInput, DURATION_CHOICES, formFrom, formProblems, newForm, updateInput } from './service-form'

const service = {
  id: 's1',
  groupId: 'hair',
  name: { en: 'Hair colouring', tk: 'Saç boýamak' },
  description: null,
  durationMin: 120,
  priceType: 'from' as const,
  priceAmount: 250,
  bufferMin: 15,
  online: true,
  staffIds: ['aya', 'maral'],
  futureBookings: 4,
}

describe('the service drawer', () => {
  it('offers 5 min to 4 h in 5-minute steps', () => {
    expect(DURATION_CHOICES[0]).toBe(5)
    expect(DURATION_CHOICES.at(-1)).toBe(240)
    expect(DURATION_CHOICES).toHaveLength(48)
  })

  it('asks for a name, and a price for fixed and «from»', () => {
    expect(formProblems(newForm('hair'))).toEqual({ name: true, amount: true })
    expect(formProblems({ ...newForm('hair'), name: 'Manicure', amount: '0' })).toEqual({ amount: true })
    expect(formProblems({ ...newForm('hair'), name: 'Manicure', priceType: 'free' })).toEqual({})
    expect(formProblems({ ...newForm('hair'), name: 'Manicure', priceType: 'hidden' })).toEqual({})
  })

  it('adds a service in the reader’s language, the rules’ buffer as null', () => {
    const form = { ...newForm('hair'), name: ' Manicure ', amount: '60', staffIds: ['aya'] }
    expect(addInput(form, 'en')).toEqual({
      groupId: 'hair',
      name: { en: 'Manicure' },
      description: null,
      durationMin: 60,
      priceType: 'fixed',
      priceAmount: 60,
      bufferMin: null,
      online: true,
      staffIds: ['aya'],
    })
    // free costs nothing, whatever was typed before
    expect(addInput({ ...form, priceType: 'free' }, 'en').priceAmount).toBe(0)
  })

  it('sends only what changed, keeping the other languages', () => {
    const form = formFrom(service, 'en')
    expect(updateInput(form, service, 'en')).toBeNull()
    // the same people in another order is no change
    expect(updateInput({ ...form, staffIds: ['maral', 'aya'] }, service, 'en')).toBeNull()
    // the market speaks English: a starter's other languages stay out of what's sent (the api refuses them)
    expect(updateInput({ ...form, name: 'Colouring', buffer: 'rule', priceType: 'hidden', amount: '' }, service, 'en')).toEqual({
      name: { en: 'Colouring' },
      bufferMin: null,
      priceType: 'hidden',
      priceAmount: 0,
    })
  })

  it('empties a description in every language, and stops a description over 200', () => {
    const described = { ...service, description: { en: 'Roots and lengths' } }
    expect(updateInput({ ...formFrom(described, 'en'), description: ' ' }, described, 'en')).toEqual({ description: null })
    expect(formProblems({ ...newForm('hair'), name: 'A', priceType: 'free', description: 'x'.repeat(201) })).toEqual({ description: true })
  })

  it('opens a price at the place with its amount, and without one when it has none', () => {
    expect(formFrom({ ...service, priceType: 'hidden', priceAmount: 400 }, 'en').amount).toBe('400')
    expect(formFrom({ ...service, priceType: 'hidden', priceAmount: 0 }, 'en').amount).toBe('')
  })
})
