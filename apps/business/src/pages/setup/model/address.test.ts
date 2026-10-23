import { describe, expect, it } from 'vitest'
import { addressEdited, addressProblem, addressUpdate, formFrom, type AddressForm } from './address'

const draft = {
  location: { cityId: 'ashgabat', address: '', street: '', lat: 37.95, lng: 58.38 },
  floor: null,
  entranceNote: null,
  hideExactAddress: false,
}

const picked: AddressForm = {
  cityId: 'ashgabat',
  query: '247 Bitarap Türkmenistan Avenue',
  picked: { line: '247 Bitarap Türkmenistan Avenue', street: 'Bitarap Türkmenistan Avenue' },
  pin: { lat: 37.94, lng: 58.37 },
  home: false,
  floor: ' 2nd floor ',
  entrance: '',
}

describe('the address step', () => {
  it('starts a draft with no address, its pin at the city centre', () => {
    const form = formFrom(draft)
    expect(form.picked).toBeNull()
    expect(form.query).toBe('')
    expect(form.pin).toEqual({ lat: 37.95, lng: 58.38 })
    expect(addressProblem(form)).toBe('pick')
  })

  it('reopens with the saved address picked', () => {
    const form = formFrom({ ...draft, location: { ...draft.location, address: '12 Oguzhan Street', street: 'Oguzhan Street' }, floor: '3' })
    expect(form.picked).toEqual({ line: '12 Oguzhan Street', street: 'Oguzhan Street' })
    expect(form.query).toBe('12 Oguzhan Street')
    expect(form.floor).toBe('3')
    expect(addressProblem(form)).toBeNull()
  })

  it('waits for a shorter address or note before anything else', () => {
    expect(addressProblem({ ...picked, picked: null, query: 'x'.repeat(121) })).toBe('long')
    // typed by hand, the line is its street
    expect(addressProblem({ ...picked, picked: { line: 'x'.repeat(121), street: 'x'.repeat(121) } })).toBe('long')
    expect(addressProblem({ ...picked, entrance: 'x'.repeat(201) })).toBe('entrance')
    expect(addressProblem({ ...picked, floor: 'x'.repeat(41) })).toBe('floor')
    expect(addressProblem({ ...picked, entrance: ` ${'x'.repeat(200)} ` })).toBeNull()
  })

  it('takes a picked search result longer than what can be typed, up to its line and street limits', () => {
    const line = `${'x'.repeat(130)}`
    expect(addressProblem({ ...picked, query: line, picked: { line, street: 'x'.repeat(110) } })).toBeNull()
    expect(addressProblem({ ...picked, picked: { line: 'x'.repeat(201), street: 'x' } })).toBe('long')
  })

  it('sends the picked line, its street and the pin; empty notes as none', () => {
    expect(addressUpdate({ ...picked, picked: picked.picked! })).toEqual({
      location: {
        cityId: 'ashgabat',
        address: '247 Bitarap Türkmenistan Avenue',
        street: 'Bitarap Türkmenistan Avenue',
        lat: 37.94,
        lng: 58.37,
      },
      floor: '2nd floor',
      entranceNote: null,
      hideExactAddress: false,
    })
  })

  it('sees a moved pin or a new note as an edit, not spaces around a note', () => {
    expect(addressEdited(picked, picked)).toBe(false)
    expect(addressEdited({ ...picked, floor: '2nd floor' }, picked)).toBe(false)
    expect(addressEdited({ ...picked, pin: { lat: 37.941, lng: 58.37 } }, picked)).toBe(true)
    expect(addressEdited({ ...picked, home: true }, picked)).toBe(true)
  })
})
