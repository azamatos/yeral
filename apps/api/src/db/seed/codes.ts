import { bookingCode } from '@yeral/domain/id'
import { AYJEMAL_BOOKINGS, GLOW_BOOKINGS } from './demo-data'

/**
 * The demo data's own booking codes (the design's YR-48213…). A generated code never takes one: before, a generated
 * code that happened to match one sent the design's booking off under another, now and then (a flaky test).
 */
export const DEMO_CODES: ReadonlySet<string> = new Set([...GLOW_BOOKINGS, ...AYJEMAL_BOOKINGS].flatMap((b) => (b.code ? [b.code] : [])))

/** A booking's code in a seed: the demo data's own as it is, else a new one no booking of the seed or the demo has. */
export function seedCode(used: Set<string>, fixed?: string): string {
  if (fixed) {
    if (used.has(fixed)) throw new Error(`the demo data gives the booking code ${fixed} twice`)
    used.add(fixed)
    return fixed
  }
  let c = bookingCode()
  while (used.has(c) || DEMO_CODES.has(c)) c = bookingCode()
  used.add(c)
  return c
}
