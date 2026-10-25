import { diffDays, today } from '@yeral/domain/time'

export type Ago = { unit: 'today' | 'yesterday' | 'days' | 'weeks' | 'months' | 'years'; count: number }

/**
 * How long ago a review was written (Venue «Düýn», «2 gün öň», «1 hepde öň»), by the market's calendar days: today,
 * yesterday, then days, weeks (from 7), months (from 30) and years (from 365), each rounded down.
 */
export function ago(at: number, now: number): Ago {
  const days = diffDays(today(now), today(at))
  if (days <= 0) return { unit: 'today', count: 0 }
  if (days === 1) return { unit: 'yesterday', count: 1 }
  if (days < 7) return { unit: 'days', count: days }
  if (days < 30) return { unit: 'weeks', count: Math.floor(days / 7) }
  if (days < 365) return { unit: 'months', count: Math.floor(days / 30) }
  return { unit: 'years', count: Math.floor(days / 365) }
}
