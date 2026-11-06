import { Moon, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { FieldMessage } from '../field'
import { TimeField } from '../time-field'

/**
 * A stretch of a business day as `@yeral/domain/hours` keeps it: minutes from the day's midnight, `close` after `open`
 * and at most a day later (18:00–02:00 is `{ open: 1080, close: 1560 }`).
 */
export type TimeRange = { open: number; close: number }

const DAY = 1440
const pad2 = (n: number) => String(n).padStart(2, '0')
const clock = (min: number) => `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`

/** The day's minute a closing time of day gives: after the opening, the next day's when it comes at or before it. */
function closeAt(open: number, time: number) {
  const base = open >= DAY ? DAY : 0
  return base + time + (time <= open - base ? DAY : 0)
}

/** One of the two times: opening 00:00 to the last step before 24:00, closing one step on to 24:00. */
function Picker({
  value,
  closing,
  step,
  size,
  label,
  invalid,
  describedBy,
  disabled,
  onChange,
}: {
  value: number
  closing?: boolean
  step: number
  size: 'm' | 'l'
  label: string
  invalid: boolean
  describedBy?: string
  disabled?: boolean
  onChange: (time: number) => void
}) {
  return (
    <TimeField
      size={size}
      step={step}
      min={closing ? step : 0}
      max={closing ? DAY : DAY - step}
      wrapperClassName="flex-none"
      className={size === 'l' ? 'w-26' : 'w-24'}
      aria-label={label}
      title={label}
      invalid={invalid}
      aria-describedby={describedBy}
      disabled={disabled}
      value={value}
      onValueChange={onChange}
    />
  )
}

export type TimeRangeFieldProps = {
  value: TimeRange
  onChange: (value: TimeRange) => void
  /** The pickers' accessible names («Monday: opens», «Monday: closes»). */
  fromLabel: string
  toLabel: string
  /**
   * A stretch inside a day that opens at this minute (a break): both times are that day's, a time of day before its
   * opening the night's, so in a day open 18:00–02:00 a break at 01:00 is minute 1500. Without it the range is the
   * day's own hours: the closing time is the next day's when it comes at or before the opening.
   */
  dayStart?: number
  /** A label before the pickers, 72 wide (a break's «Break»); the row becomes a group it names. */
  label?: ReactNode
  /** A remove button after the pickers (a break's), 36 ghost. */
  remove?: { label: string; onClick: () => void }
  /** The slate pill shown while it closes after midnight, for the closing time given: «until 02:00, next day». */
  nextDay?: (close: string) => ReactNode
  /** A message under the pickers (14 px icon, `role="alert"`); both pickers turn invalid and point at it. */
  error?: ReactNode
  disabled?: boolean
  /** Minutes between the options: the hours pass the contract's `HOURS_STEP` (30, book Q-128). */
  step?: number
  /** The fields' height: M 40 (96 wide, business forms) or L 48 (104 wide, a phone). */
  size?: 'm' | 'l'
  /** More in the row after the pill (a day's «+ Break» link). */
  children?: ReactNode
  className?: string
}

/**
 * TimeRangeField (DS-Controls → 04 Time field «Range»; B-Settings hours, B-Onboarding step 4, the special-day modal):
 * two TimeFields (M 40 × 96) with an en dash, opening 00:00–23:30 and closing 00:30–24:00 in `step` minutes. A closing time at or
 * before the opening time is the next day's, and the slate pill with a moon says so: the same time on both is a full
 * day, which the hours refuse («Opening and closing can't be at the same time»). Checking a range against its
 * neighbours (the part after midnight must end before the next day opens) is the screen's; it passes the message.
 */
export function TimeRangeField({
  value,
  onChange,
  fromLabel,
  toLabel,
  dayStart,
  label,
  remove,
  nextDay,
  error,
  disabled,
  step = 30,
  size = 'm',
  children,
  className,
}: TimeRangeFieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const messageId = `${id}-message`
  const pillId = `${id}-next-day`
  const every = step > 0 && DAY % step === 0 ? step : 30
  const inside = dayStart !== undefined
  // a break's times read as times of day; a day's closing past midnight as the next day's
  const base = !inside && value.open >= DAY ? DAY : 0
  const openTime = value.open >= DAY ? value.open - DAY : value.open
  const late = value.close - base > DAY
  const closeTime = late ? value.close - base - DAY : value.close - base
  const night = (time: number) => (dayStart !== undefined && time < dayStart ? time + DAY : time)
  const invalid = !!error
  const pill = nextDay && late
  const describe = (...ids: (string | false)[]) => ids.filter(Boolean).join(' ') || undefined
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
        value={openTime}
        step={every}
        size={size}
        label={fromLabel}
        invalid={invalid}
        describedBy={describe(invalid && messageId)}
        disabled={disabled}
        onChange={(time) => {
          const open = night(time)
          // a day's closing time stays, and may move to the next day against the new opening
          onChange({ open, close: inside ? value.close : closeAt(open, closeTime) })
        }}
      />
      <span aria-hidden className="text-n-600">
        –
      </span>
      <Picker
        value={closeTime}
        closing
        step={every}
        size={size}
        label={toLabel}
        invalid={invalid}
        describedBy={describe(!!pill && pillId, invalid && messageId)}
        disabled={disabled}
        onChange={(time) => onChange({ open: value.open, close: inside ? night(time) : closeAt(value.open, time) })}
      />
      {pill && (
        <span
          id={pillId}
          className="inline-flex h-6 flex-none items-center gap-1 rounded-pill border border-st-cancelled-line bg-st-cancelled-bg px-2 text-micro font-semibold whitespace-nowrap text-st-cancelled-ink"
        >
          <Moon aria-hidden strokeWidth={2} className="size-3" />
          {nextDay(clock(closeTime))}
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
