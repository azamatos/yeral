import { BOOKING_CODE_PREFIX } from '@yeral/domain/id'
import { AYJEMAL_BOOKINGS, GLOW_BOOKINGS } from './demo-data'

/** The demo data's own booking codes (the design's YR-48213…): kept on their bookings, never generated. */
export const DEMO_CODES: ReadonlySet<string> = new Set([...GLOW_BOOKINGS, ...AYJEMAL_BOOKINGS].flatMap((b) => (b.code ? [b.code] : [])))

/**
 * Five-digit codes that look random but come in the same order every run (mulberry32 from a fixed start). Before, the
 * seed drew them from the crypto RNG, and a draw that matched a design code now and then sent the design's booking off
 * under another (a flaky test); now any clash shows on every run or never.
 */
export function seededCodes(start = 0x5eed): () => string {
  let state = start
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let x = Math.imul(state ^ (state >>> 15), 1 | state)
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x
    const n = ((x ^ (x >>> 14)) >>> 0) % 90_000
    return `${BOOKING_CODE_PREFIX}${10_000 + n}`
  }
}

/**
 * A seed's booking codes: a demo booking keeps its own (one the demo data doesn't list, or gives twice, is a mistake in
 * the data); every other booking gets the next generated code no booking of the seed and no demo booking has. `taken`:
 * codes the database already holds (the demo workspace's remake in a live database, book F-242): never given, and a
 * demo booking whose own code is taken gets a generated one.
 */
export function codeMaker(next: () => string = seededCodes(), taken: ReadonlySet<string> = new Set()): (fixed?: string) => string {
  const used = new Set<string>(taken)
  return (fixed) => {
    if (fixed) {
      if (!DEMO_CODES.has(fixed)) throw new Error(`the booking code ${fixed} isn't one of the demo data's (DEMO_CODES)`)
      if (used.has(fixed) && !taken.has(fixed)) throw new Error(`the demo data gives the booking code ${fixed} twice`)
      if (!taken.has(fixed)) {
        used.add(fixed)
        return fixed
      }
    }
    let c = next()
    while (used.has(c) || DEMO_CODES.has(c)) c = next()
    used.add(c)
    return c
  }
}
