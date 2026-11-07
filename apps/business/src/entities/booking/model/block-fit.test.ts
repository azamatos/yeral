import { describe, expect, it } from 'vitest'
import { blockFit } from './block-fit'

const long = { size: 'long' as const, height: 66, markers: 0, timer: false }

describe('blockFit', () => {
  it('keeps the whole first line in a wide block', () => {
    expect(blockFit({ ...long, width: 180, timer: true })).toEqual({ time: 'range', name: true, markers: false, timer: 'top' })
  })

  it('moves the time left to its own line before it squeezes the range, and drops it where no line is left', () => {
    expect(blockFit({ ...long, width: 148, timer: true }).timer).toBe('line')
    expect(blockFit({ ...long, width: 148, height: 49, timer: true })).toMatchObject({ time: 'range', timer: 'none' })
  })

  it('shrinks the range to the start, then shows the name only', () => {
    expect(blockFit({ ...long, width: 71 }).time).toBe('start')
    expect(blockFit({ ...long, width: 45 }).time).toBe('none')
  })

  it('drops the markers before they push the time out', () => {
    expect(blockFit({ ...long, width: 148, markers: 2 })).toMatchObject({ time: 'range', markers: true })
    expect(blockFit({ ...long, width: 71, markers: 2 })).toMatchObject({ time: 'start', markers: false })
  })

  it('gives 30 and 15 minutes the start and the name, then the time only, then the name only', () => {
    const short = { size: 'short' as const, height: 15, markers: 0, timer: false }
    expect(blockFit({ ...short, width: 100 })).toMatchObject({ time: 'start', name: true })
    expect(blockFit({ ...short, width: 60 })).toMatchObject({ time: 'start', name: false })
    expect(blockFit({ ...short, width: 40 })).toMatchObject({ time: 'none', name: true })
    expect(blockFit({ size: 'medium', height: 32, markers: 0, timer: true, width: 100 }).timer).toBe('line')
  })
})
