import { describe, expect, it } from 'vitest'
import { DAY, formatTime, parseTime } from './time'

describe('parseTime', () => {
  it.each([
    ['9', 540],
    ['09', 540],
    ['21', 1260],
    ['930', 570],
    ['0930', 570],
    ['1745', 1065],
    ['9:30', 570],
    ['09:30', 570],
    ['9:3', 570],
    ['9.30', 570],
    ['9 30', 570],
    [' 17:45 ', 1065],
    ['0', 0],
    ['00:00', 0],
    ['23:59', 1439],
  ])('reads «%s» as %i', (text, minutes) => {
    expect(parseTime(text)).toBe(minutes)
  })

  it.each([['9:75'], ['25:00'], ['24:00'], ['2400'], ['24:15'], ['99999'], ['abc'], ['9:'], [':30'], ['9::30'], [''], ['  ']])(
    'refuses «%s»',
    (text) => {
      expect(parseTime(text)).toBeNull()
    },
  )

  it('allows 24:00 only as a closing time', () => {
    expect(parseTime('24:00', { max: DAY })).toBe(DAY)
    expect(parseTime('2400', { max: DAY })).toBe(DAY)
    expect(parseTime('24:01', { max: DAY })).toBeNull()
  })

  it('keeps the time inside min and max', () => {
    expect(parseTime('08:00', { min: 540 })).toBeNull()
    expect(parseTime('09:00', { min: 540 })).toBe(540)
    expect(parseTime('18:01', { max: 1080 })).toBeNull()
  })
})

describe('formatTime', () => {
  it.each([
    [0, '00:00'],
    [540, '09:00'],
    [570, '09:30'],
    [1065, '17:45'],
    [1439, '23:59'],
    [DAY, '24:00'],
  ])('writes %i as «%s»', (minutes, text) => {
    expect(formatTime(minutes)).toBe(text)
  })
})
