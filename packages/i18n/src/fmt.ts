/**
 * Formats every number people read (client spec §8, skill `i18n`). Hand-written instead of `Intl` so the server and
 * every browser print the same thing (Turkmen locale data is missing in some ICU builds, and SSR must match hydration).
 * Words (months, weekdays, units) come from the messages, so the native review covers them.
 */
import type { Price } from '@yeral/domain/model'
import { formatPhone } from '@yeral/domain/phone'
import { dow, hm, parseYmd } from '@yeral/domain/time'
import { createTranslator } from 'use-intl/core'
import { messages, type Locale } from './messages'

const NBSP = ' '

/** Grouping and decimal marks: Turkmen and Russian `1 410` and `4,9` (the calendar header groups 4 digits too); English `1,410` and `4.9`. */
const MARKS: Record<Locale, { group: string; decimal: string }> = {
  tk: { group: NBSP, decimal: ',' },
  ru: { group: NBSP, decimal: ',' },
  en: { group: ',', decimal: '.' },
}

export function formatNumber(locale: Locale, n: number, fractionDigits = 0): string {
  const { group, decimal } = MARKS[locale]
  const [int = '0', frac] = Math.abs(n).toFixed(fractionDigits).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, group)
  return `${n < 0 ? '−' : ''}${grouped}${frac ? decimal + frac : ''}`
}

export function createFmt(locale: Locale) {
  const t = createTranslator({ locale, messages: messages[locale], namespace: 'fmt' })
  const num = (n: number, digits = 0) => formatNumber(locale, n, digits)
  const monthOf = (date: string) => String(parseYmd(date).getUTCMonth() + 1) as keyof (typeof messages)['tk']['fmt']['months']
  const weekdayOf = (date: string) => String(dow(date)) as keyof (typeof messages)['tk']['fmt']['weekdays']

  const fmt = {
    locale,
    number: num,
    /** `40 TMT` */
    money: (amount: number) => t('money', { amount: num(amount) }),
    /** `80 TMT`, `250 TMT-den`, `Mugt`; hidden prices show the average bill when there is one (`≈ 150 TMT`), else nothing. */
    price: (p: Price, avgBill?: number | null) => {
      switch (p.type) {
        case 'fixed':
          return t('money', { amount: num(p.amount) })
        case 'from':
          return t('priceFrom', { amount: num(p.amount) })
        case 'free':
          return t('priceFree')
        case 'hidden':
          return avgBill ? t('priceApprox', { amount: num(avgBill) }) : ''
      }
    },
    /** `4,9` */
    rating: (r: number) => num(r, 1),
    /** `60 min`, `1 sag 30 min`, `2 sag`: up to an hour in minutes, then hours. */
    duration: (minutes: number) => {
      if (minutes <= 60) return t('minutes', { m: minutes })
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return m ? t('hoursMinutes', { h, m }) : t('hours', { h })
    },
    /** `850 m`, `1,2 km`, `12 km` */
    distance: (metres: number) => {
      if (metres < 1000) return t('m', { n: num(Math.max(10, Math.round(metres / 10) * 10)) })
      const km = metres / 1000
      return t('km', { n: km < 10 ? num(Math.round(km * 10) / 10, 1).replace(/[,.]0$/, '') : num(Math.round(km)) })
    },
    /** `14:30` (24-hour, minutes from midnight) */
    time: (min: number) => hm(min),
    /** `14:30–15:30` */
    timeRange: (start: number, end: number) => `${hm(start)}–${hm(end)}`,
    /** `15 oktýabr` */
    dayMonth: (date: string) => t('dayMonth', { day: parseYmd(date).getUTCDate(), month: t(`months.${monthOf(date)}`) }),
    /** `15 okt.` */
    shortDate: (date: string) => t('dayMonth', { day: parseYmd(date).getUTCDate(), month: t(`monthsShort.${monthOf(date)}`) }),
    /** `Penşenbe` */
    weekday: (date: string) => t(`weekdays.${weekdayOf(date)}`),
    /** `Pe` */
    weekdayShort: (date: string) => t(`weekdaysShort.${weekdayOf(date)}`),
    /** `Penşenbe, 15 oktýabr` */
    weekdayDate: (date: string) => t('weekdayDate', { weekday: fmt.weekday(date), date: fmt.dayMonth(date) }),
    /** `Oktýabr 2026` (month picker header) */
    monthYear: (date: string) =>
      t('monthYear', { month: t(`monthsStandalone.${monthOf(date)}`), year: String(parseYmd(date).getUTCFullYear()) }),
    /** `Şu gün`, `Ertir`, otherwise the weekday. */
    relativeDay: (date: string, today: string) => {
      const d = Math.round((parseYmd(date).getTime() - parseYmd(today).getTime()) / 86_400_000)
      if (d === 0) return t('today')
      if (d === 1) return t('tomorrow')
      return fmt.weekday(date)
    },
    /** `+993 65 12 34 56` */
    phone: (raw: string) => formatPhone(raw),
  }
  return fmt
}

export type Fmt = ReturnType<typeof createFmt>

/** A translator over the shared messages, outside React (the api's SMS texts, decline reasons). */
export function createT(locale: Locale) {
  return createTranslator({ locale, messages: messages[locale] })
}
