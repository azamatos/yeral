/**
 * Locale-aware labels for money, durations and dates. Works in server and client components
 * (useFmt only uses next-intl hooks that are allowed in both).
 * Dates are salon-local 'YYYY-MM-DD' strings, so Intl formats them in UTC to avoid shifting days.
 */
import { useLocale, useTranslations } from 'next-intl'
import { addDays, diffDays, hm, parseYmd, today } from '@/domain/time'

type CommonT = ReturnType<typeof useTranslations<'common'>>

const fmtCache = new Map<string, Intl.DateTimeFormat>()
function df(locale: string, o: Intl.DateTimeFormatOptions) {
  const k = locale + JSON.stringify(o)
  let f = fmtCache.get(k)
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' })
    fmtCache.set(k, f)
  }
  return f
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function makeFmt(locale: string, t: CommonT) {
  const nf = new Intl.NumberFormat(locale)
  const money = (n: number) => t('currency', { value: nf.format(Math.round(n)) })
  const dayMonth = (d: string) => df(locale, { day: 'numeric', month: 'long' }).format(parseYmd(d))
  const relDay = (d: string): string | null => {
    const n = diffDays(d, today())
    return n === 0 ? t('today') : n === 1 ? t('tomorrow') : n === -1 ? t('yesterday') : null
  }
  return {
    money,
    price: (s: { price: number; priceFrom?: boolean }) => (s.priceFrom ? t('priceFrom', { value: nf.format(s.price) }) : money(s.price)),
    dur: (min: number) => {
      const h = Math.floor(min / 60)
      const m = min % 60
      return !h ? t('minutes', { count: m }) : !m ? t('hours', { h }) : t('hoursMinutes', { h, m })
    },
    hm,
    dayMonth,
    dayMonthShort: (d: string) => df(locale, { day: 'numeric', month: 'short' }).format(parseYmd(d)).replace('.', ''),
    weekdayShort: (d: string) => df(locale, { weekday: 'short' }).format(parseYmd(d)),
    weekdayLong: (d: string) => df(locale, { weekday: 'long' }).format(parseYmd(d)),
    monthYear: (d: string) => cap(df(locale, { month: 'long', year: 'numeric' }).format(parseYmd(d)).replace(' г.', '')),
    /** «Среда, 15 октября» */
    longDay: (d: string) => cap(df(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(parseYmd(d))),
    relDay,
    /** «Сегодня, 14:30» / «15 октября, 18:00» */
    when: (date: string, start: number) => `${relDay(date) ?? dayMonth(date)}, ${hm(start)}`,
    /** the same, mid-sentence: «на завтра, 15:30» */
    whenInline: (date: string, start: number) => `${(relDay(date) ?? dayMonth(date)).toLowerCase()}, ${hm(start)}`,
    /** «Свободно сегодня 14:30» */
    free: (slot: { date: string; start: number } | null | undefined) => {
      if (!slot) return t('noWindows')
      const n = diffDays(slot.date, today())
      if (n === 0) return t('freeToday', { time: hm(slot.start) })
      if (n === 1) return t('freeTomorrow', { time: hm(slot.start) })
      return t('freeOn', { date: dayMonth(slot.date) })
    },
    open: (s: { open: true; until: number } | { open: false; inDays: number; at: number } | { open: false; inDays: null }) => {
      if (s.open) return t('openUntil', { time: hm(s.until) })
      if (s.inDays === null) return t('closed')
      if (s.inDays === 0) return t('closedOpensToday', { time: hm(s.at) })
      if (s.inDays === 1) return t('closedOpensTomorrow', { time: hm(s.at) })
      return t('closedOpensOn', { day: dayMonth(addDays(today(), s.inDays)), time: hm(s.at) })
    },
    rating: (n: number) => new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n),
  }
}

export type Fmt = ReturnType<typeof makeFmt>

export function useFmt(): Fmt {
  const t = useTranslations('common')
  const locale = useLocale()
  return makeFmt(locale, t)
}
