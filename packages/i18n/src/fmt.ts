/**
 * Formats every number people read (client spec §8, skill `i18n`). Hand-written instead of `Intl` so the server and
 * every browser print the same thing (Turkmen locale data is missing in some ICU builds, and SSR must match hydration).
 * Words (months, weekdays, units) come from the messages, so the native review covers them. The currency comes from the
 * market (`MARKET.currency`), number marks from the language. Examples below are English, the source (ADR 0022).
 */
import { MARKET } from '@yeral/domain/market'
import type { Price } from '@yeral/domain/model'
import { formatPhone } from '@yeral/domain/phone'
import { diffDays, dow, hm, parseYmd } from '@yeral/domain/time'
import { createTranslator } from 'use-intl/core'
import { messages, type Locale, type SharedMessages } from './messages'

const NBSP = ' '
const DAY_MIN = 1440

/** A day may end at midnight (`24:00`, as the hours pickers draw it); anything later is the next day's clock time. */
const clock = (min: number) => hm(min > DAY_MIN ? min % DAY_MIN : min)

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
  const monthOf = (date: string) => String(parseYmd(date).getUTCMonth() + 1) as keyof SharedMessages['fmt']['months']
  const weekdayOf = (date: string) => String(dow(date)) as keyof SharedMessages['fmt']['weekdays']
  const money = (amount: number) => ({ amount: num(amount), currency: MARKET.currency })

  const fmt = {
    locale,
    number: num,
    /** `40 TMT` */
    money: (amount: number) => t('money', money(amount)),
    /** `80 TMT`, `from 250 TMT`, `Free`; hidden prices show the average bill when there is one (`≈ 150 TMT`), else nothing. */
    price: (p: Price, avgBill?: number | null) => {
      switch (p.type) {
        case 'fixed':
          return t('money', money(p.amount))
        case 'from':
          return t('priceFrom', money(p.amount))
        case 'free':
          return t('priceFree')
        case 'hidden':
          return avgBill ? t('priceApprox', money(avgBill)) : ''
      }
    },
    /** `4.9` (`4,9` in Turkmen and Russian) */
    rating: (r: number) => num(r, 1),
    /** `60 min`, `1 h 30 min`, `2 h`: up to an hour in minutes, then hours. */
    duration: (minutes: number) => {
      if (minutes <= 60) return t('minutes', { m: minutes })
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      return m ? t('hoursMinutes', { h, m }) : t('hours', { h })
    },
    /** `850 m`, `1.2 km`, `12 km` */
    distance: (metres: number) => {
      const rounded = Math.max(10, Math.round(metres / 10) * 10)
      if (rounded < 1000) return t('m', { n: num(rounded) })
      const km = metres / 1000
      return t('km', { n: km < 10 ? num(Math.round(km * 10) / 10, 1).replace(/[,.]0$/, '') : num(Math.round(km)) })
    },
    /** `14:30` (24-hour, minutes from midnight) */
    time: (min: number) => clock(min),
    /** `14:30–15:30` */
    timeRange: (start: number, end: number) => `${clock(start)}–${clock(end)}`,
    /** `15 October` */
    dayMonth: (date: string) => t('dayMonth', { day: parseYmd(date).getUTCDate(), month: t(`months.${monthOf(date)}`) }),
    /** `15 Oct` */
    shortDate: (date: string) => t('dayMonth', { day: parseYmd(date).getUTCDate(), month: t(`monthsShort.${monthOf(date)}`) }),
    /** `Thursday` */
    weekday: (date: string) => t(`weekdays.${weekdayOf(date)}`),
    /** `Th` */
    weekdayShort: (date: string) => t(`weekdaysShort.${weekdayOf(date)}`),
    /** `Thursday, 15 October` */
    weekdayDate: (date: string) => t('weekdayDate', { weekday: fmt.weekday(date), date: fmt.dayMonth(date) }),
    /** `October 2026` (month picker header) */
    monthYear: (date: string) =>
      t('monthYear', { month: t(`monthsStandalone.${monthOf(date)}`), year: String(parseYmd(date).getUTCFullYear()) }),
    /** `Today`, `Tomorrow`, the weekday within the coming week (`Saturday`), otherwise the date (`21 October`). */
    relativeDay: (date: string, today: string) => {
      const d = diffDays(date, today)
      if (d === 0) return t('today')
      if (d === 1) return t('tomorrow')
      return d > 1 && d < 7 ? fmt.weekday(date) : fmt.dayMonth(date)
    },
    /** `+993 65 12 34 56`, by the market's phone rules */
    phone: (raw: string) => formatPhone(raw),
  }
  return fmt
}

export type Fmt = ReturnType<typeof createFmt>

/** A translator over the shared messages, outside React (the api's SMS texts, decline reasons). */
export function createT(locale: Locale) {
  return createTranslator({ locale, messages: messages[locale] })
}
