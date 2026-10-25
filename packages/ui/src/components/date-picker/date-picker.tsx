import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useState } from 'react'
import { DayPicker, type ClassNames, type Matcher } from 'react-day-picker'
import { cn } from '../../lib/cn'
import { useField } from '../field'
import { inputClass } from '../input'
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

export type DateRange = { from: Ymd; to: Ymd }

export type DatePickerCopy = {
  /** The month over the days, and the grid's name: «November 2026» (`fmt.monthYear`). */
  month: (firstDay: Ymd) => string
  /** A weekday's short name, Monday first: «Mo» (`fmt.weekdayShort`). */
  weekday: (date: Ymd) => string
  /** A day's name for screen readers: «Monday, 2 November» (`fmt.weekdayDate`). */
  day: (date: Ymd) => string
  /** What the field shows for a date (single) or a range: «2 November 2026», «2–5 November 2026». */
  value: (date: Ymd) => string
  range?: (range: DateRange) => string
  /** The field with nothing picked yet. */
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
}
type Single = Common & { mode?: 'single'; value: Ymd | null; onValueChange: (date: Ymd) => void }
type Range = Common & { mode: 'range'; value: DateRange | null; onValueChange: (range: DateRange) => void }
export type DatePickerProps = Single | Range

const day = 'size-10 rounded-pill border-0 bg-transparent p-0 text-small font-semibold text-n-900 tabular-nums'

/** The month (DS-Components → «Pickers»): Monday first, 40 round days, today ringed, the chosen day solid a-500. */
const classNames: Partial<ClassNames> = {
  root: 'relative w-[292px] text-n-900',
  months: 'flex flex-col',
  month: 'flex flex-col gap-3',
  month_caption: 'flex h-9 items-center pr-20',
  caption_label: 'text-body font-semibold',
  nav: 'absolute top-0 right-0 flex gap-0.5',
  button_previous:
    'inline-flex size-9 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-n-900 hover:bg-group focus-visible:shadow-focus focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-n-400 aria-disabled:hover:bg-transparent',
  button_next:
    'inline-flex size-9 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent text-n-900 hover:bg-group focus-visible:shadow-focus focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-n-400 aria-disabled:hover:bg-transparent',
  month_grid: 'w-full border-collapse',
  weekday: 'h-8 p-0 text-center text-label font-normal text-n-500 uppercase',
  week: '',
  day: cn(
    'p-0 text-center',
    '[&>button]:cursor-pointer [&>button]:hover:bg-group [&>button]:focus-visible:shadow-focus [&>button]:focus-visible:outline-none',
    'data-[today=true]:not-data-[selected=true]:[&>button]:shadow-[inset_0_0_0_1px_var(--color-n-900)]',
    'data-[selected=true]:[&>button]:bg-a-500 data-[selected=true]:[&>button]:text-white data-[selected=true]:[&>button]:hover:bg-a-500',
    'data-[disabled=true]:[&>button]:cursor-default data-[disabled=true]:[&>button]:font-normal data-[disabled=true]:[&>button]:text-n-500 data-[disabled=true]:[&>button]:hover:bg-transparent',
  ),
  day_button: day,
  outside: 'invisible',
  // a range: its days on an a-50 band, the first and last solid at its rounded ends
  range_middle: 'bg-a-50 [&>button]:bg-transparent! [&>button]:text-a-700! [&>button]:hover:bg-a-100!',
  range_start: 'rounded-l-pill bg-a-50',
  range_end: 'rounded-r-pill bg-a-50',
}

/**
 * A date field (B-Settings special days; rule 10a: react-day-picker, styled to DS-Components → «Pickers»): the field
 * looks like an input with a calendar icon and opens the month in a popover. `mode="range"` picks a first and a last day
 * with two clicks (the first click starts again from that day). Dates in and out are `YYYY-MM-DD`; Monday comes first,
 * and the app gives every word (`copy`, through its formatters). Keyboard as the library gives it: arrows by day and
 * week, Page Up/Down by month, Home/End to the week's ends, Enter picks, Escape closes; the field gets the focus back.
 * Inside <Field> the label names the field and is read with its value.
 */
export function DatePicker(props: DatePickerProps) {
  const { today, min, max, isDisabled, copy, invalid, disabled, className } = props
  const field = useField()
  const valueId = useId()
  const [open, setOpen] = useState(false)
  // a range being picked: its first day, until the second click
  const [start, setStart] = useState<Ymd | null>(null)

  const id = props.id ?? field?.id
  const range = props.mode === 'range' ? props.value : null
  const single = props.mode === 'range' ? null : props.value
  const first = range?.from ?? single ?? null
  const shown = range ? (copy.range?.(range) ?? `${copy.value(range.from)} – ${copy.value(range.to)}`) : single ? copy.value(single) : null

  const matchers: Matcher[] = []
  if (min) matchers.push({ before: toDate(min) })
  if (max) matchers.push({ after: toDate(max) })
  if (isDisabled) matchers.push((date: Date) => isDisabled(toYmd(date)))

  const shared = {
    weekStartsOn: 1 as const,
    showOutsideDays: false,
    autoFocus: true,
    today: today ? toDate(today) : undefined,
    defaultMonth: first ? toDate(first) : today ? toDate(today) : undefined,
    startMonth: min ? toDate(min) : undefined,
    endMonth: max ? toDate(max) : undefined,
    disabled: matchers,
    classNames,
    formatters: {
      formatCaption: (month: Date) => copy.month(toYmd(month)),
      formatWeekdayName: (weekday: Date) => copy.weekday(toYmd(weekday)),
    },
    labels: {
      labelGrid: (month: Date) => copy.month(toYmd(month)),
      labelDayButton: (date: Date) => copy.day(toYmd(date)),
      labelPrevious: () => copy.prev,
      labelNext: () => copy.next,
    },
    components: {
      Chevron: ({ orientation }: { orientation?: string }) =>
        orientation === 'left' ? <ChevronLeft aria-hidden className="size-5" /> : <ChevronRight aria-hidden className="size-5" />,
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
          setStart(null)
          setOpen(false)
          props.onValueChange(date < start ? { from: date, to: start } : { from: start, to: date })
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
          id={id}
          disabled={disabled ?? field?.disabled}
          aria-invalid={(invalid ?? field?.invalid) ? true : undefined}
          aria-describedby={field?.describedBy}
          aria-labelledby={field ? `${field.labelId} ${valueId}` : undefined}
          className={cn(
            inputClass,
            'flex h-12 cursor-pointer items-center justify-between gap-2 text-left disabled:cursor-default disabled:bg-n-50 disabled:text-n-500',
            className,
          )}
        >
          <span id={valueId} className={cn('truncate', !shown && 'text-n-500')}>
            {shown ?? copy.placeholder}
          </span>
          <CalendarDays aria-hidden className="size-5 flex-none text-n-500" />
        </button>
      </PopoverTrigger>
      {/* the month is named by the field's label (or the placeholder outside a field) */}
      <PopoverContent
        aria-labelledby={field?.labelId}
        aria-label={field ? undefined : copy.placeholder}
        className="w-auto min-w-0 p-4"
        // the library puts the focus on the chosen day (or today) itself
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {picker}
      </PopoverContent>
    </Popover>
  )
}
