/**
 * A service on a business's menu (book B-38; the limits chapter): its length, price and own buffer, as the services
 * screen offers them.
 */
import type { PriceType } from './model'

/** A service lasts 5–240 minutes in 5-minute steps. */
export const SERVICE_MINUTES = { min: 5, max: 240, step: 5 } as const
/** Whole manats, up to 5 digits. */
export const PRICE_MAX = 99_999
/** A service's own buffer after it; without one it takes the business's (`bufferMinutes`). */
export const SERVICE_BUFFERS = [0, 5, 10, 15, 20, 30] as const

export interface ServiceTerms {
  durationMin: number
  priceType: PriceType
  priceAmount: number
  /** null = the business's buffer. */
  bufferMin: number | null
}

/** Problems with a service's terms, by field; empty when valid. */
export function serviceErrors(s: ServiceTerms): Partial<Record<keyof ServiceTerms, 'invalid'>> {
  const errors: Partial<Record<keyof ServiceTerms, 'invalid'>> = {}
  const { min, max, step } = SERVICE_MINUTES
  if (!Number.isInteger(s.durationMin) || s.durationMin < min || s.durationMin > max || s.durationMin % step) errors.durationMin = 'invalid'
  // fixed and "from" cost something, free costs nothing; a hidden price counts in the revenue, so anything goes
  const least = s.priceType === 'fixed' || s.priceType === 'from' ? 1 : 0
  const most = s.priceType === 'free' ? 0 : PRICE_MAX
  if (!Number.isInteger(s.priceAmount) || s.priceAmount < least || s.priceAmount > most) errors.priceAmount = 'invalid'
  if (s.bufferMin !== null && !(SERVICE_BUFFERS as readonly number[]).includes(s.bufferMin)) errors.bufferMin = 'invalid'
  return errors
}
