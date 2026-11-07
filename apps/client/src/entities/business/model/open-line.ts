import type { BusinessCard } from '@yeral/contract/catalog'
import { addDays } from '@yeral/domain/time'
import type { Fmt } from '@yeral/i18n'

/** The api's open state, the same on a card and on the business page. */
export type OpenState = BusinessCard['open']

type Words = (key: 'openUntil' | 'opensToday' | 'opensTomorrow' | 'opensOn' | 'closed', values?: Record<string, string>) => string

/**
 * The open line (Venue «Häzir açyk · 20:00-a çenli», States 06): open until the closing time (past midnight read as the
 * next day's clock), else closed with when it opens next: today, tomorrow or the day, from the api's open state.
 */
export function openLine(open: OpenState, today: string, fmt: Fmt, t: Words): { text: string; isOpen: boolean } {
  if (open.open) return { text: t('openUntil', { time: fmt.time(open.until) }), isOpen: true }
  if (open.inDays === null || open.at === null) return { text: t('closed'), isOpen: false }
  const time = fmt.time(open.at)
  if (open.inDays === 0) return { text: t('opensToday', { time }), isOpen: false }
  if (open.inDays === 1) return { text: t('opensTomorrow', { time }), isOpen: false }
  return { text: t('opensOn', { day: fmt.relativeDay(addDays(today, open.inDays), today), time }), isOpen: false }
}
