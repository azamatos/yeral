import type { CalendarView } from '@yeral/contract/calendar'
import { addDays } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { cn } from '@yeral/ui/cn'
import { CountBadge } from '@yeral/ui/count-badge'
import { DatePicker } from '@yeral/ui/date-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@yeral/ui/popover'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { MultiSelect, OptionList, SelectLayer } from '@yeral/ui/select'
import { Switch } from '@yeral/ui/switch'
import { Tooltip } from '@yeral/ui/tooltip'
import { ChevronLeft, ChevronRight, Clock, Palette, Plus, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON } from '@/entities/booking'
import { useDatePickerWords } from '@/shared/i18n'
import { weekCell } from '../model/grid'
import { FILTER_STATUSES, type FilterStatus } from '../model/search'
import { CalendarLegend } from './calendar-legend'

const EVERYONE = 'all'
const STATUS_INK = {
  pending: 'text-st-pending-ink',
  confirmed: 'text-st-confirmed-ink',
  completed: 'text-st-completed-ink',
  noshow: 'text-st-noshow-ink',
} as const
/** A key that types into a field or a list, not the page: its own arrows win there. */
const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    !!target.closest(
      'input, textarea, select, [role="listbox"], [role="dialog"], [role="menu"], [role="radiogroup"], [role="tablist"], [role="slider"]',
    ))

/**
 * The calendar's toolbar (B7-Calendar · B2): one M 40 row that is also the page's top bar — DateNav (‹ date › and a
 * small Today that greys out on today), Day · Week, one people picker (Everyone, one person or several, with search
 * and each one's count), Filters (Show cancelled, «What the colours mean»), Requests with an amber count (hidden at
 * 0), New booking as the only primary. Under 1280 Filters and Requests are icons with a badge; on a phone the row is
 * the date, then Day · Week and Filters (the people and the actions live elsewhere there).
 */
export function CalendarToolbar({
  date,
  today,
  week,
  firstDay,
  onDate,
  onRange,
  columns,
  people,
  onPeople,
  specialist,
  view,
  cancelled,
  onCancelled,
  statuses,
  onStatuses,
  onClearFilters,
  phoneStaff,
  onPhoneStaff,
  requests,
  onRequests,
  onNew,
}: {
  date: string
  today: string
  week: boolean
  /** The week's Monday (the day itself in Day). */
  firstDay: string
  onDate: (date: string) => void
  onRange: (range: 'day' | 'week') => void
  columns: CalendarView['columns']
  /** The people picked; nobody = everyone. */
  people: readonly string[]
  onPeople: (people: string[]) => void
  specialist: boolean
  view: CalendarView | undefined
  cancelled: boolean
  onCancelled: (on: boolean) => void
  /** The statuses ticked in Filters; none = every status. */
  statuses: readonly FilterStatus[]
  onStatuses: (next: FilterStatus[]) => void
  /** Filters' Clear: every status, cancelled hidden. */
  onClearFilters: () => void
  /** The phone's person (one at a time there) and its «Whose calendar» sheet. */
  phoneStaff?: string
  onPhoneStaff: (staffId: string) => void
  /** The waiting requests; `onRequests` opens the most urgent (none when the list can't be read). */
  requests: number
  onRequests?: () => void
  onNew: () => void
}) {
  const t = useTranslations('calendar')
  const s = useTranslations('status')
  const fmt = useFmt()
  const [sheet, setSheet] = useState(false)
  const words = useDatePickerWords()
  const onToday = date === today
  const step = week ? 7 : 1
  const picked = people.filter((id) => columns.some((c) => c.staffId === id))
  const one = picked.length === 1 ? columns.find((c) => c.staffId === picked[0]) : undefined
  // each person's bookings on screen: the day's, or the week's
  const countOf = (c: CalendarView['columns'][number]) => {
    if (!view) return null
    const days = week ? Array.from({ length: 7 }, (_, i) => addDays(firstDay, i)) : [date]
    const cells = days.map((d) => weekCell(view, c, d))
    const off = cells.every((x) => x.off)
    return off ? t(week ? 'people.offThisWeek' : 'people.offToday') : String(cells.reduce((sum, x) => sum + x.bookings, 0))
  }
  const activeFilters = statuses.length + (cancelled ? 1 : 0)
  // each status's bookings on screen (the day's, or the week's) of the people shown; cancelled ones only when loaded
  const counted = (view?.bookings ?? []).filter(
    (b) => (week || b.date === date) && (!picked.length || b.items.some((i) => i.staffId && picked.includes(i.staffId))),
  )
  const countFor = (status: string) => counted.filter((b) => b.status === status).length
  const onPhone = columns.find((c) => c.staffId === phoneStaff)
  // DateNav's keys (B7-Calendar · B2): ← → a day back or on (a week in Week), T today; never while typing or in a list
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || typing(e.target)) return
      const next =
        e.key === 'ArrowLeft'
          ? addDays(date, -step)
          : e.key === 'ArrowRight'
            ? addDays(date, step)
            : e.key.toLowerCase() === 't'
              ? today
              : null
      if (!next || next === date) return
      e.preventDefault()
      onDate(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [date, step, today, onDate])
  const legendRow = (
    <button
      type="button"
      className="flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-ctl-s border-0 bg-transparent px-2.5 text-left text-ctl-m leading-5 text-n-900 hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:bg-n-50"
    >
      <Palette aria-hidden strokeWidth={1.75} className="size-4.5 text-n-600" />
      {t('filters.colours')}
      <ChevronRight aria-hidden strokeWidth={1.75} className="ml-auto size-4 text-n-600" />
    </button>
  )
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex h-10 flex-none items-center gap-0.5 rounded-ctl-m border border-n-300 bg-n-0 p-[3px] max-sm:flex-1">
        <Tooltip content={t('keys.prev', { what: t(week ? 'prevWeek' : 'prev') })}>
          <Button
            variant="plain"
            size="s"
            iconOnly
            aria-label={t(week ? 'prevWeek' : 'prev')}
            aria-keyshortcuts="ArrowLeft"
            onClick={() => onDate(addDays(date, -step))}
          >
            <ChevronLeft />
          </Button>
        </Tooltip>
        <DatePicker
          look="nav"
          className="max-sm:flex-1 max-sm:justify-center"
          copy={{
            ...words,
            value: week
              ? () => t('weekRange', { from: fmt.shortDate(firstDay), to: fmt.shortDate(addDays(firstDay, 6)) })
              : fmt.shortWeekdayDate,
            placeholder: t('pickDate'),
          }}
          today={today}
          value={date}
          onValueChange={onDate}
        />
        <Tooltip content={t('keys.next', { what: t(week ? 'nextWeek' : 'next') })}>
          <Button
            variant="plain"
            size="s"
            iconOnly
            aria-label={t(week ? 'nextWeek' : 'next')}
            aria-keyshortcuts="ArrowRight"
            onClick={() => onDate(addDays(date, step))}
          >
            <ChevronRight />
          </Button>
        </Tooltip>
        <span aria-hidden className="mx-[3px] h-5 w-px flex-none bg-n-200" />
        {onToday ? (
          <Tooltip content={t('youreOnToday')}>
            <Button variant="tertiary" size="s" aria-disabled className="text-n-400 hover:bg-n-100 active:translate-y-0 active:bg-n-100">
              {t('today')}
            </Button>
          </Tooltip>
        ) : (
          <Tooltip content={t('keys.today')}>
            <Button variant="tertiary" size="s" aria-keyshortcuts="T" onClick={() => onDate(today)}>
              {t('today')}
            </Button>
          </Tooltip>
        )}
      </div>
      {!specialist && onPhone && columns.length > 1 && (
        <SelectLayer
          open={sheet}
          onOpenChange={setSheet}
          label={t('people.title')}
          closeLabel={t('people.close')}
          trigger={
            <button
              type="button"
              aria-label={t('people.whose', { name: onPhone.name })}
              className="flex size-10 flex-none cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent p-0 focus-visible:shadow-focus focus-visible:outline-none sm:hidden"
            >
              <Avatar name={onPhone.name} src={onPhone.photo?.url} size={32} letters={1} tone="tint" decorative />
            </button>
          }
        >
          <OptionList
            sheet
            searchable
            label={t('people.title')}
            searchPlaceholder={t('people.search')}
            empty={(q) => t('people.nothing', { q })}
            picked={new Set([onPhone.staffId])}
            onPick={(staffId) => {
              onPhoneStaff(staffId)
              setSheet(false)
            }}
            options={[
              {
                label: t('people.takesBookings'),
                options: columns.map((c) => ({ value: c.staffId, label: c.name, meta: countOf(c) })),
              },
            ]}
          />
        </SelectLayer>
      )}
      <Segmented
        aria-label={t('views.range')}
        className="max-sm:order-2"
        value={week ? 'week' : 'day'}
        onValueChange={(range) => onRange(range as 'day' | 'week')}
      >
        <SegmentedItem value="day">{t('views.day')}</SegmentedItem>
        <SegmentedItem value="week">{t('views.week')}</SegmentedItem>
      </Segmented>
      {!specialist && (
        <MultiSelect
          aria-label={t('views.who')}
          className="max-sm:hidden"
          label={t('people.label')}
          active={picked.length > 0}
          summary={
            one ? (
              <>
                <Avatar name={one.name} size={24} letters={1} tone="tint" decorative />
                <span className="truncate">{one.name}</span>
              </>
            ) : picked.length > 1 ? (
              t('people.several', { n: picked.length })
            ) : (
              <>
                {t('people.everyone')}
                <span className="font-medium text-n-600">{columns.length}</span>
              </>
            )
          }
          value={picked.length ? picked : [EVERYONE]}
          onValueChange={(next) => {
            const added = next.find((v) => !(picked.length ? picked : [EVERYONE]).includes(v))
            const rest = next.filter((v) => v !== EVERYONE)
            onPeople(added === EVERYONE || !rest.length ? [] : rest)
          }}
          options={[
            { value: EVERYONE, label: t('people.everyone'), meta: String(columns.length) },
            ...columns.map((c) => ({ value: c.staffId, label: c.name, meta: countOf(c) })),
          ]}
          searchPlaceholder={t('people.search')}
          empty={(q) => t('people.nothing', { q })}
          title={t('people.title')}
          closeLabel={t('people.close')}
          clearLabel={t('people.clear')}
          doneLabel={t('people.done')}
        />
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={activeFilters ? 'tint' : 'secondary'}
            aria-label={activeFilters ? t('filters.active', { n: activeFilters }) : t('filters.label')}
            className="data-[state=open]:border-a-500 data-[state=open]:shadow-input-focus max-lg:w-10 max-lg:px-0 max-sm:order-2"
          >
            <SlidersHorizontal aria-hidden />
            <span className="max-lg:hidden">{activeFilters ? t('filters.active', { n: activeFilters }) : t('filters.label')}</span>
            {activeFilters > 0 && (
              <CountBadge
                aria-hidden
                tone="accent"
                className="absolute -top-1.75 -right-1.75 h-4.5 min-w-4.5 bg-a-500 text-[11px] text-white shadow-[0_0_0_2px_var(--color-n-0)] lg:hidden"
              >
                {activeFilters}
              </CountBadge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent aria-label={t('filters.label')} align="start" className="w-72 p-1.5">
          <div role="group" aria-labelledby="calendar-filter-status">
            <p
              id="calendar-filter-status"
              className="m-0 flex h-7 items-center px-2.5 text-[11px] leading-4 font-semibold tracking-[.06em] text-n-500 uppercase"
            >
              {t('filters.status')}
            </p>
            {FILTER_STATUSES.map((status) => {
              const Icon = BOOKING_STATUS_ICON[status]
              const on = statuses.includes(status)
              return (
                <label
                  key={status}
                  className="flex h-10 cursor-pointer items-center gap-2.5 rounded-ctl-s px-2.5 text-ctl-m leading-5 text-n-900 hover:bg-n-50"
                >
                  <Checkbox
                    checked={on}
                    onChange={() =>
                      onStatuses(
                        on ? statuses.filter((x) => x !== status) : FILTER_STATUSES.filter((x) => x === status || statuses.includes(x)),
                      )
                    }
                  />
                  <Icon aria-hidden strokeWidth={2} className={cn('size-4 flex-none', STATUS_INK[status])} />
                  <span className={cn('flex-1', on && 'font-semibold')}>{s(status)}</span>
                  <span className="text-[13px] leading-[18px] text-n-500 tabular-nums">{countFor(status)}</span>
                </label>
              )
            })}
          </div>
          <div aria-hidden className="mx-1 my-1.5 h-px bg-n-200" />
          <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-ctl-s pr-1.5 pl-2.5 text-ctl-m leading-5 text-n-900 hover:bg-n-50">
            <span className="flex-1">{t('showCancelled')}</span>
            {cancelled && <span className="text-[13px] leading-[18px] text-n-500 tabular-nums">{countFor('cancelled')}</span>}
            <Switch checked={cancelled} onCheckedChange={onCancelled} />
          </label>
          <div aria-hidden className="mx-1 my-1.5 h-px bg-n-200" />
          <CalendarLegend statuses={view?.internalStatuses ?? []} trigger={legendRow} />
          {activeFilters > 0 && (
            <div className="-mx-1.5 mt-1.5 -mb-1.5 flex h-12 items-center justify-between border-t border-n-200 pr-1.5 pl-4">
              <span className="text-[13px] leading-[18px] text-n-600">{t('filters.on', { n: activeFilters })}</span>
              <Button variant="tertiary" size="s" onClick={onClearFilters}>
                {t('filters.clear')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <span className="flex-1 max-sm:hidden" />
      {requests > 0 && (
        <Button
          variant="secondary"
          className="max-lg:w-10 max-lg:px-0 max-sm:hidden"
          aria-disabled={onRequests ? undefined : true}
          onClick={onRequests}
        >
          <Clock aria-hidden className="lg:hidden" />
          <span className="max-lg:hidden">{t('requestsButton')}</span>
          <CountBadge
            tone="attention"
            className="max-lg:absolute max-lg:-top-1.75 max-lg:-right-1.75 max-lg:h-4.5 max-lg:min-w-4.5 max-lg:text-[11px] max-lg:shadow-[0_0_0_2px_var(--color-n-0)]"
          >
            {requests}
          </CountBadge>
          {/* its name is what it shows, then what a click does (B-Calendar: «Requests 6 — open the most urgent») */}
          {onRequests && <span className="sr-only">{t('openMostUrgent')}</span>}
        </Button>
      )}
      <Button variant="primary" className="max-sm:hidden" onClick={onNew}>
        <Plus aria-hidden />
        {t('newBooking')}
      </Button>
    </div>
  )
}
