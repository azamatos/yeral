import { addDays, today as todayOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Calendar } from '@yeral/ui/calendar'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { useState, type ComponentProps } from 'react'
import { useTranslations } from 'use-intl'
import { addMonths, ANY_TIME, dateOf, pickDate, QUICK_DAYS, TIMES_OF_DAY, type QuickDay, type TimeOfDay, type When } from '../model/when'

/** A Monday, to name the week's days in order. */
const A_MONDAY = '2026-11-02'

/** The words for a When: «Any time», «Tomorrow · Evening», «Thu, 20 Nov · Morning». */
export function useWhenLabel() {
  const t = useTranslations('searchBar')
  const fmt = useFmt()
  return (when: When) => {
    const { day, tod } = when
    const dayLabel = typeof day === 'object' ? fmt.shortWeekdayDate(day.date) : t(day === 'any' ? 'anyTime' : day)
    return tod ? `${dayLabel} · ${t(`tod.${tod}`)}` : dayLabel
  }
}

/**
 * «When» is not a select (C7-Home): quick chips, a Monday-first month with today ringed and past days off, and the
 * time of day; every change applies at once, Done closes. On the phone sheet the footer is the sheet's.
 */
export function WhenPanel({
  when,
  onChange,
  onDone,
  touch,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange'> & { when: When; onChange: (when: When) => void; onDone?: () => void; touch?: boolean }) {
  const t = useTranslations('searchBar')
  const fmt = useFmt()
  const label = useWhenLabel()
  const today = todayOf()
  const picked = dateOf(when, today)
  const [month, setMonth] = useState((picked ?? today).slice(0, 7))
  const thisMonth = today.slice(0, 7)
  return (
    <div {...props} className={cn('flex flex-col gap-4', touch ? 'px-4 pt-3' : 'p-2', className)}>
      <ChipRadioGroup
        aria-label={t('quick')}
        value={typeof when.day === 'string' ? when.day : ''}
        onValueChange={(day) => onChange({ ...when, day: day as QuickDay })}
        className={cn(touch && 'flex-nowrap overflow-x-auto')}
        options={QUICK_DAYS.map((day) => ({ value: day, label: t(day === 'any' ? 'anyTime' : day) }))}
      />
      <div className={cn('flex gap-8', touch && 'flex-col gap-5')}>
        <Calendar
          month={month}
          value={picked ?? undefined}
          today={today}
          isDisabled={(d) => d < today}
          monthLabel={fmt.monthYear(`${month}-01`)}
          weekdays={[0, 1, 2, 3, 4, 5, 6].map((i) => fmt.weekdayShort(addDays(A_MONDAY, i)))}
          dayLabel={(d) => fmt.weekdayDate(d)}
          prevLabel={t('prevMonth')}
          nextLabel={t('nextMonth')}
          onPrev={month > thisMonth ? () => setMonth(addMonths(month, -1)) : undefined}
          onNext={() => setMonth(addMonths(month, 1))}
          onValueChange={(d) => onChange(pickDate(when, d, today))}
          className={cn('w-[280px] flex-none', touch && 'w-full [&>div:last-child]:grid-cols-7 [&>div:last-child]:justify-items-center')}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span id={`${props.id}-tod`} className="flex h-8 items-center text-label text-n-500 uppercase">
            {t('timeOfDay')}
          </span>
          <ChipRadioGroup
            aria-labelledby={`${props.id}-tod`}
            value={when.tod ?? ''}
            onValueChange={(tod) => onChange({ ...when, tod: tod as TimeOfDay })}
            className={cn(touch ? 'grid grid-cols-2' : 'flex-col items-start')}
            options={TIMES_OF_DAY.map((tod) => ({
              value: tod,
              label: (
                <>
                  {t(`tod.${tod}`)}
                  <span className="font-normal text-n-500">{t(`todHint.${tod}`)}</span>
                </>
              ),
            }))}
          />
        </div>
      </div>
      {!touch && (
        <div className="-mx-4 -mb-4 flex items-center justify-between gap-2 border-t border-n-200 px-4 py-2">
          <Button variant="tertiary" size="s" onClick={() => onChange(ANY_TIME)}>
            {t('clear')}
          </Button>
          <span className="text-dense text-n-600">{label(when)}</span>
          <Button variant="secondary" size="s" onClick={onDone}>
            {t('done')}
          </Button>
        </div>
      )}
    </div>
  )
}
