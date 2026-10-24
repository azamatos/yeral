import { useTranslations } from 'use-intl'
import type { Messages } from './messages'

type Weekday = keyof Messages['fmt']['weekdays']

/** A weekday's name, Monday first: «Monday», or «Mo» short (the setup step list's summary). */
export function useDayName() {
  const t = useTranslations('fmt')
  return (day: number, short = false) => {
    const key = String(day) as Weekday
    return short ? t(`weekdaysShort.${key}`) : t(`weekdays.${key}`)
  }
}
