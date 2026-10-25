import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useState, type ComponentProps } from 'react'
import { DayButton, DayPicker, type ClassNames, type Matcher } from 'react-day-picker'
import { cn } from '../../lib/cn'
import { PagerButton } from '../date-strip'
import { useField } from '../field'
import { inputClass, useControlProps } from '../input'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'

/** A date as the apps keep it: `YYYY-MM-DD` (business-local, `@yeral/domain/time`). */
type Ymd = string

const pad = (n: number) => String(n).padStart(2, '0')
/** The day on the browser's calendar, at its midnight: the library counts days there, and nothing here needs a clock. */
const toDate = (date: Ymd) => {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(y, m - 1, d)
}
const toYmd = (date: Date): Ymd => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const nextDay = (date: Ymd) => {
  const d = toDate(date)
  d.setDate(d.getDate() + 1)
  return toYmd(d)
}

export type DateRange = { from: Ymd; to: Ymd }

export type DatePickerCopy = {
  /** The language of these words (`lang` on the month, so a screen reader reads them in it). */
  lang: string
  /** The month over the days, and the grid's name: «November 2026» (`fmt.monthYear`). */
  month: (firstDay: Ymd) => string
  /** A weekday's short name over its column, Monday first: «Mo» (`fmt.weekdayShort`), and its full name: «Monday». */
  weekday: (date: Ymd) => string
  weekdayName: (date: Ymd) => string
  /** A day's name for screen readers: «Monday, 2 November» (`fmt.weekdayDate`); today's carries `aria-current`. */
  day: (date: Ymd) => string
  /** What the field shows for a date (single) or a range: «2 November 2026», «2–5 November 2026». */
  value: (date: Ymd) => string
  range: (range: DateRange) => string
  /** The field with nothing picked yet; outside a <Field>, the month's name too. */
  placeholder: string
  prev: string
  next: string
}

type Common = {
  /** Ringed in the month: the business's today, `YYYY-MM-DD`. */
  today?: Ymd
  /** The first and last days that can be picked; the months beyond them don't open. */
  min?: Ymd
  max?: Ymd
  isDisabled?: (date: Ymd) => boolean
  copy: DatePickerCopy
  id?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
  /**
   * `field` (default): a form's 48 field with the calendar icon. `title`: a toolbar's day as a title, 17/24 600 with a
   * chevron, 36 high (B-Calendar `.dbtn`).
   */
  look?: 'field' | 'title'
}
type Single = Common & { mode?: 'single'; value: Ymd | null; onValueChange: (date: Ymd) => void }
type Range = Common & { mode: 'range'; value: DateRange | null; onValueChange: (range: DateRange) => void }
export type DatePickerProps = Single | Range

/** The month (DS-Components → «Pickers»): Monday first, 40 round days, today ringed, the chosen day solid a-500. */
const classNames: Partial<ClassNames> = {
  root: 'relative w-[292px] max-w-full text-n-900',
  months: 'flex flex-col',
  month: 'flex flex-col gap-3',
  month_caption: 'flex h-9 items-center pr-20',
  caption_label: 'text-body font-semibold',
  nav: 'absolute top-0 right-0 flex gap-0.5',
  month_grid: 'w-full border-collapse',
  weekday: 'h-8 p-0 text-center text-label text-n-500 uppercase',
  day: cn(
    'p-0 text-center',
    '[&>button]:cursor-pointer [&>button]:hover:bg-group [&>button]:focus-visible:shadow-focus [&>button]:focus-visible:outline-none',
    'data-[today=true]:not-data-[selected=true]:[&>button]:shadow-[inset_0_0_0_1px_var(--color-n-900)]',
    'data-[selected=true]:[&>button]:bg-a-500 data-[selected=true]:[&>button]:text-white data-[selected=true]:[&>button]:hover:bg-a-500',
    'data-[disabled=true]:[&>button]:cursor-default data-[disabled=true]:[&>button]:font-normal data-[disabled=true]:[&>button]:text-n-500 data-[disabled=true]:[&>button]:hover:bg-transparent',
  ),
  // a 320 phone: 36 days, so the week fits the popover
  day_button: 'size-10 rounded-pill border-0 bg-transparent p-0 text-small font-semibold text-n-900 tabular-nums max-[359px]:size-9',
  hidden: 'invisible',
  // a range: its days on an a-50 band, the first and last solid at its rounded ends
  range_middle: 'bg-a-50 [&>button]:bg-transparent! [&>button]:text-a-700! [&>button]:hover:bg-a-100!',
  range_start: 'rounded-l-pill bg-a-50',
  range_end: 'rounded-r-pill bg-a-50',
}

// the library's parts drawn with ours: the month arrows are DateStrip's pager (36, r10, 18 chevrons), today's day says so
type NavProps = ComponentProps<'button'>
const offOf = (off: NavProps['aria-disabled']) => off === true || off === 'true'
const PreviousMonthButton = ({ 'aria-label': label = '', 'aria-disabled': off, ...props }: NavProps) => (
  <PagerButton {...props} label={label} disabled={offOf(off)}>
    <ChevronLeft aria-hidden />
  </PagerButton>
)
const NextMonthButton = ({ 'aria-label': label = '', 'aria-disabled': off, ...props }: NavProps) => (
  <PagerButton {...props} label={label} disabled={offOf(off)}>
    <ChevronRight aria-hidden />
  </PagerButton>
)
const TodayAwareDayButton = (props: ComponentProps<typeof DayButton>) => (
  <DayButton {...props} aria-current={props.modifiers.today ? 'date' : undefined} />
)
const components = { PreviousMonthButton, NextMonthButton, DayButton: TodayAwareDayButton }

/**
 * A date field (B-Settings special days; rule 10a: react-day-picker, styled to DS-Components → «Pickers»): the field
 * looks like an input with a calendar icon and opens the month in a popover. `mode="range"` picks a first and a last day
 * with two clicks (a new opening starts again; a range over a day that can't be picked starts again at the second
 * click). Dates in and out are `YYYY-MM-DD`; Monday comes first, and the app gives every word (`copy`, through its
 * formatters). Keyboard as the library gives it: arrows by day and week, Page Up/Down by month, Home/End to the week's
 * ends, Enter picks, Escape closes; the field gets the focus back. Inside <Field> the label names the field (read with
 * its value) and the month.
 */
export function DatePicker(props: DatePickerProps) {
  const { today, min, max, isDisabled, copy, className, look = 'field' } = props
  const field = useField()
  const control = useControlProps({ id: props.id, disabled: props.disabled, invalid: props.invalid })
  const valueId = useId()
  const [open, setOpen] = useState(false)
  // a range being picked: its first day, until the second click
  const [start, setStart] = useState<Ymd | null>(null)

  const range = props.mode === 'range' ? props.value : null
  const single = props.mode === 'range' ? null : props.value
  const first = range?.from ?? single ?? null
  const shown = range ? copy.range(range) : single ? copy.value(single) : null

  const unpickable = (date: Ymd) => (!!min && date < min) || (!!max && date > max) || !!isDisabled?.(date)
  const matchers: Matcher[] = [(date: Date) => unpickable(toYmd(date))]

  const shared = {
    weekStartsOn: 1 as const,
    showOutsideDays: false,
    lang: copy.lang,
    today: today ? toDate(today) : undefined,
    defaultMonth: first ? toDate(first) : today ? toDate(today) : undefined,
    startMonth: min ? toDate(min) : undefined,
    endMonth: max ? toDate(max) : undefined,
    disabled: matchers,
    classNames,
    components,
    formatters: {
      formatCaption: (month: Date) => copy.month(toYmd(month)),
      formatWeekdayName: (weekday: Date) => copy.weekday(toYmd(weekday)),
    },
    labels: {
      labelGrid: (month: Date) => copy.month(toYmd(month)),
      labelWeekday: (weekday: Date) => copy.weekdayName(toYmd(weekday)),
      labelDayButton: (date: Date) => copy.day(toYmd(date)),
      labelPrevious: () => copy.prev,
      labelNext: () => copy.next,
    },
  }

  const picker =
    props.mode === 'range' ? (
      <DayPicker
        {...shared}
        mode="range"
        selected={
          start ? { from: toDate(start), to: toDate(start) } : range ? { from: toDate(range.from), to: toDate(range.to) } : undefined
        }
        onSelect={(_, picked) => {
          const date = toYmd(picked)
          if (!start) return setStart(date)
          const [from, to] = date < start ? [date, start] : [start, date]
          // a range can't hold a day that can't be picked: it starts again there
          for (let d = from; d <= to; d = nextDay(d)) if (unpickable(d)) return setStart(date)
          setStart(null)
          setOpen(false)
          props.onValueChange({ from, to })
        }}
      />
    ) : (
      <DayPicker
        {...shared}
        mode="single"
        required
        selected={single ? toDate(single) : undefined}
        onSelect={(picked) => {
          setOpen(false)
          props.onValueChange(toYmd(picked))
        }}
      />
    )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        setStart(null)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          {...control}
          aria-labelledby={field ? `${field.labelId} ${valueId}` : undefined}
          className={cn(
            look === 'title'
              ? 'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-s border-0 bg-transparent px-2.5 text-[17px] leading-6 font-semibold tracking-[-0.01em] whitespace-nowrap text-n-900 hover:bg-group focus-visible:shadow-focus focus-visible:outline-none'
              : cn(
                  inputClass,
                  'flex h-12 cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-default disabled:bg-n-50 disabled:text-n-500',
                ),
            className,
          )}
        >
          <span id={valueId} className={cn('truncate', !shown && 'text-n-500')}>
            {shown ?? copy.placeholder}
          </span>
          {look === 'title' ? (
            <ChevronDown aria-hidden className="size-4.5 flex-none text-n-600" />
          ) : (
            <CalendarDays aria-hidden className="size-5 flex-none text-n-500" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-labelledby={field?.labelId}
        aria-label={field ? undefined : copy.placeholder}
        className="w-auto min-w-0 p-4 max-sm:p-3"
        // the chosen day (or today, or the first that can be picked) takes the focus once the popover holds it, also
        // inside a modal, whose focus trap would take back an earlier focus
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.querySelector<HTMLButtonElement>('[data-day] button[tabindex="0"]')?.focus()
        }}
      >
        {picker}
      </PopoverContent>
    </Popover>
  )
}
