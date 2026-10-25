import { parseYmd } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import type { DatePickerCopy } from '@yeral/ui/date-picker'
import { useLocale, useTranslations } from 'use-intl'

/**
 * A date or a span of dates in running text: «2 November 2026», «2–5 November 2026», «28 December 2026 – 3 January
 * 2027»; without the year (`year: false`, a day that repeats every year): «1 January», «21–22 March».
 */
export function useDateSpan() {
  const t = useTranslations('datePicker')
  const fmt = useFmt()
  const yearOf = (date: string) => String(parseYmd(date).getUTCFullYear())
  return (from: string, to: string, { year = true }: { year?: boolean } = {}) => {
    const one = (date: string) => (year ? t('withYear', { date: fmt.dayMonth(date), year: yearOf(date) }) : fmt.dayMonth(date))
    if (from === to) return one(from)
    if (from.slice(0, 7) === to.slice(0, 7)) return t('sameMonth', { from: parseYmd(from).getUTCDate(), to: one(to) })
    if (!year || yearOf(from) === yearOf(to)) return t('range', { from: fmt.dayMonth(from), to: one(to) })
    return t('range', { from: one(from), to: one(to) })
  }
}

/**
 * The words `DatePicker` (`@yeral/ui`) shows, through the app's formatters: «November 2026» over the month, «Mo» over its
 * days, «Monday, 2 November» for a screen reader, and the field's date or span (`useDateSpan`). A screen may put its own
 * `value` or `range` over them (the special days drop the year of one that repeats every year).
 */
export function useDatePickerWords(): DatePickerCopy {
  const t = useTranslations('datePicker')
  const fmt = useFmt()
  const span = useDateSpan()
  return {
    lang: useLocale(),
    month: fmt.monthYear,
    weekday: fmt.weekdayShort,
    weekdayName: fmt.weekday,
    day: fmt.weekdayDate,
    value: (date) => span(date, date),
    range: ({ from, to }) => span(from, to),
    placeholder: t('placeholder'),
    prev: t('prev'),
    next: t('next'),
  }
}
