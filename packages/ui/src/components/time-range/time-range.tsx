import { ChevronDown, Moon, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { FieldMessage } from '../field'
import { inputClass } from '../input'

/** A stretch of one day in minutes from its midnight: `to` up to 1440 (24:00); a `to` before `from` is the next day's. */
export type TimeRange = { from: number; to: number }

const DAY = 1440
const pad2 = (n: number) => String(n).padStart(2, '0')

/** 570 → «09:30», 1440 → «24:00»: the pickers' 24-hour clock. */
export function formatTime(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
}

/** Whether the range closes after midnight: its closing time comes before its opening time. */
export const pastMidnight = (range: TimeRange) => range.to < range.from

function Picker({
  value,
  options,
  label,
  invalid,
  describedBy,
  disabled,
  onChange,
}: {
  value: number
  options: number[]
  label: string
  invalid: boolean
  describedBy?: string
  disabled?: boolean
  onChange: (min: number) => void
}) {
  return (
    <span className="relative inline-flex flex-none">
      <select
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(inputClass, 'h-10 w-26 cursor-pointer appearance-none pr-7 pl-3 text-small tabular-nums disabled:cursor-default')}
      >
        {options.map((m) => (
          <option key={m} value={m}>
            {formatTime(m)}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-n-600"
      />
    </span>
  )
}

export type TimeRangeFieldProps = {
  value: TimeRange
  onChange: (value: TimeRange) => void
  /** The pickers' accessible names («Monday: opens», «Monday: closes»). */
  fromLabel: string
  toLabel: string
  /** A label before the pickers, 72 wide (a break's «Break»); the row becomes a group it names. */
  label?: ReactNode
  /** A remove button after the pickers (a break's), 36 ghost. */
  remove?: { label: string; onClick: () => void }
  /** The slate pill shown while it closes after midnight, for the closing time given: «until 02:00, next day». */
  nextDay?: (close: string) => ReactNode
  /** A message under the pickers (14 px icon, `role="alert"`); both pickers turn invalid and point at it. */
  error?: ReactNode
  disabled?: boolean
  /** Minutes between the options: 30 for the hours (book Q-128). */
  step?: number
  /** More in the row after the pill (a day's «+ Break» link). */
  children?: ReactNode
  className?: string
}

/**
 * TimeRangeField (DS-Patterns → Inputs, B-Settings hours, B-Onboarding step 4, the special-day modal): two 40 × 104
 * native selects with an en dash, opening 00:00–23:30 and closing 00:30–24:00 in `step` minutes. A closing time
 * before the opening time is the next day's: the slate pill with a moon says so. Checking a range against its
 * neighbours (the part after midnight must end before the next day opens) is the screen's; it passes the message.
 */
export function TimeRangeField({
  value,
  onChange,
  fromLabel,
  toLabel,
  label,
  remove,
  nextDay,
  error,
  disabled,
  step = 30,
  children,
  className,
}: TimeRangeFieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const messageId = `${id}-message`
  const opens: number[] = []
  for (let m = 0; m < DAY; m += step) opens.push(m)
  const closes = [...opens.slice(1), DAY]
  const invalid = !!error
  const describedBy = invalid ? messageId : undefined
  return (
    <div
      role={label ? 'group' : undefined}
      aria-labelledby={label ? labelId : undefined}
      className={cn('flex min-w-0 flex-wrap items-center gap-2', className)}
    >
      {label && (
        <span id={labelId} className="min-w-18 text-dense font-semibold text-n-600">
          {label}
        </span>
      )}
      <Picker
        value={value.from}
        options={opens}
        label={fromLabel}
        invalid={invalid}
        describedBy={describedBy}
        disabled={disabled}
        onChange={(from) => onChange({ ...value, from })}
      />
      <span aria-hidden className="text-n-600">
        –
      </span>
      <Picker
        value={value.to}
        options={closes}
        label={toLabel}
        invalid={invalid}
        describedBy={describedBy}
        disabled={disabled}
        onChange={(to) => onChange({ ...value, to })}
      />
      {nextDay && pastMidnight(value) && (
        <span className="inline-flex h-6 flex-none items-center gap-1 rounded-pill border border-st-cancelled-line bg-st-cancelled-bg px-2 text-micro font-semibold whitespace-nowrap text-st-cancelled-ink">
          <Moon aria-hidden strokeWidth={2} className="size-3" />
          {nextDay(formatTime(value.to))}
        </span>
      )}
      {remove && (
        <Button variant="ghost" size="s" iconOnly aria-label={remove.label} disabled={disabled} onClick={remove.onClick}>
          <X aria-hidden strokeWidth={1.75} />
        </Button>
      )}
      {children}
      {error && (
        <FieldMessage id={messageId} className="basis-full">
          {error}
        </FieldMessage>
      )}
    </div>
  )
}
