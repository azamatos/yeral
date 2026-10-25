import { useFmt } from '@yeral/i18n'
import type { DatePickerCopy } from '@yeral/ui/date-picker'
import { useTranslations } from 'use-intl'

/**
 * The words `DatePicker` (`@yeral/ui`) shows, through the app's formatters: «November 2026» over the month, «Mo» over its
 * days, «Monday, 2 November» for a screen reader, «2 November 2026» and «2 – 5 November 2026» in the field. A screen
 * may put its own `value` or `range` over them (the special days drop the year of one that repeats every year).
 */
export function useDatePickerWords(): DatePickerCopy {
  const t = useTranslations('datePicker')
  const fmt = useFmt()
  const withYear = (date: string) => t('withYear', { date: fmt.dayMonth(date), year: date.slice(0, 4) })
  return {
    month: fmt.monthYear,
    weekday: fmt.weekdayShort,
    day: fmt.weekdayDate,
    value: withYear,
    range: ({ from, to }) => (from === to ? withYear(from) : t('range', { from: fmt.dayMonth(from), to: withYear(to) })),
    placeholder: t('placeholder'),
    prev: t('prev'),
    next: t('next'),
  }
}
