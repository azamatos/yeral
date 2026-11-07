import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { FieldMessage } from '@yeral/ui/field'
import { Switch } from '@yeral/ui/switch'
import { TimeRangeField, type TimeRange } from '@yeral/ui/time-range'
import { Plus, X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

export type Break = { start: number; end: number }

/** A break needs a day of at least three steps, so time is left on both sides of it. */
const breakRoom = (step: number) => 3 * step

/**
 * A new break's place: 13:00–14:00 (B7-Hours: the last time splits at its lunch hour) when it leaves time on both
 * sides, else one step in the middle of the day (a night bar's).
 */
export function newBreak({ open, close }: TimeRange, step: number): Break {
  if (open < 780 && close > 840) return { start: 780, end: 840 }
  const start = open + Math.floor((close - open) / (2 * step)) * step
  return { start, end: start + step }
}

export type HoursRowProps = {
  /** The first column: the day's name (104 wide), or a label (the special day's «Hours»). */
  name: ReactNode
  /** The on/off switch before the name; none where the row can't be switched (the special day's). */
  switch?: { checked: boolean; label: string; disabled?: boolean; onChange: (on: boolean) => void }
  /** The day's times while it's on; null while it's off (the row reads `closedText`). */
  hours: TimeRange | null
  /** The break in them, shown as the gap between two times; the row never offers one when `breaks` is false. */
  break: Break | null
  breaks?: boolean
  onChange: (next: { hours: TimeRange; break: Break | null }) => void
  closedText: ReactNode
  /** A faint line under the times («Same as Monday»; the business window a shift stays in). */
  note?: ReactNode
  /** The row's message (`role="alert"`); every time field of the row turns invalid and points at it. */
  error?: ReactNode
  disabled?: boolean
  /** Minutes between the lists' options. */
  step: number
  /** Times under the name, one per line (the 480 drawer, a phone); otherwise one line from 1280 up and under it below. */
  narrow?: boolean
  /** The fields' accessible names and the buttons'. */
  labels: {
    opens: string
    closes: string
    secondOpens?: string
    secondCloses?: string
    addBreak?: string
    removeBreak?: (range: string) => string
  }
  nextDay: (time: string) => ReactNode
  className?: string
}

/**
 * One day of an hours editor (B7-Hours · B1, `HoursEditor`'s day row): the switch, the day's name, its times on one
 * line as «09:00 – 20:00», and a break as the gap between two times — «09:00 – 13:00  14:00 – 20:00 ×» — so there is
 * no Break row. «Add break» (Tertiary S, the right end of the row) splits the last time; × joins the two again. Off,
 * the row reads «Closed» and keeps its times for when it's on again. Under 1280 px of screen (or `narrow`: the 480
 * drawer, a phone) the times sit under the day's name, one per line, Add break staying at the end of the name's line.
 */
export function HoursRow({
  name,
  switch: toggle,
  hours,
  break: br,
  breaks = true,
  onChange,
  closedText,
  note,
  error,
  disabled,
  step,
  narrow,
  labels,
  nextDay,
  className,
}: HoursRowProps) {
  const t = useTranslations('hours')
  const fmt = useFmt()
  const id = useId()
  const messageId = `${id}-message`
  const invalid = !!error
  const on = hours !== null
  const canAdd = on && breaks && !br && !disabled && hours.close - hours.open >= breakRoom(step)
  // the first time ends at the break; the second starts after it (both of that day, a night's past midnight)
  const first: TimeRange | null = hours && { open: hours.open, close: br ? br.start : hours.close }
  const second: TimeRange | null = hours && br && { open: br.end, close: hours.close }
  return (
    <div
      className={cn(
        'grid items-start gap-x-3 gap-y-2 py-3',
        narrow
          ? 'grid-cols-[auto_minmax(0,1fr)_auto]'
          : 'grid-cols-[40px_104px_minmax(0,1fr)_auto] max-lg:grid-cols-[auto_minmax(0,1fr)_auto]',
        className,
      )}
    >
      {toggle && (
        <span className="flex h-10 items-center">
          <Switch checked={toggle.checked} disabled={toggle.disabled} aria-label={toggle.label} onCheckedChange={toggle.onChange} />
        </span>
      )}
      <span className={cn('flex h-10 min-w-0 items-center text-small font-semibold', !toggle && 'col-span-2')}>{name}</span>
      {hours && first ? (
        <div
          className={cn(
            'flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2',
            narrow
              ? cn('col-span-full row-start-2 flex-col items-start', toggle && 'pl-13')
              : cn('max-lg:col-span-full max-lg:row-start-2 max-lg:flex-col max-lg:items-start', toggle && 'max-lg:pl-13'),
          )}
        >
          <TimeRangeField
            value={first}
            onChange={(r) =>
              onChange(
                br ? { hours: { open: r.open, close: hours.close }, break: { start: r.close, end: br.end } } : { hours: r, break: null },
              )
            }
            fromLabel={labels.opens}
            toLabel={labels.closes}
            nextDay={nextDay}
            step={step}
            disabled={disabled}
            invalid={invalid}
            describedBy={invalid ? messageId : undefined}
          />
          {second && br && (
            <span className="inline-flex min-w-0 items-center gap-2">
              <TimeRangeField
                value={second}
                onChange={(r) => onChange({ hours: { open: hours.open, close: r.close }, break: { start: br.start, end: r.open } })}
                fromLabel={labels.secondOpens ?? ''}
                toLabel={labels.secondCloses ?? ''}
                dayStart={hours.open}
                nextDay={nextDay}
                step={step}
                disabled={disabled}
                invalid={invalid}
                describedBy={invalid ? messageId : undefined}
              />
              {!disabled && (
                <Button
                  variant="plain"
                  size="s"
                  iconOnly
                  aria-label={labels.removeBreak?.(fmt.timeRange(br.start, br.end))}
                  title={labels.removeBreak?.(fmt.timeRange(br.start, br.end))}
                  onClick={() => onChange({ hours, break: null })}
                >
                  <X aria-hidden strokeWidth={1.75} />
                </Button>
              )}
            </span>
          )}
          {note && <span className="basis-full text-micro text-n-500">{note}</span>}
          {error && (
            <FieldMessage id={messageId} className="basis-full">
              {error}
            </FieldMessage>
          )}
        </div>
      ) : (
        <span
          className={cn(
            'flex h-10 items-center text-small text-n-500',
            narrow ? 'col-start-3 row-start-1' : 'max-lg:col-start-3 max-lg:row-start-1',
          )}
        >
          {closedText}
        </span>
      )}
      {canAdd && (
        <span className={cn('flex h-10 items-center', narrow ? 'col-start-3 row-start-1' : 'max-lg:col-start-3 max-lg:row-start-1')}>
          <Button
            variant="tertiary"
            size="s"
            aria-label={labels.addBreak}
            onClick={() => onChange({ hours, break: newBreak(hours, step) })}
          >
            <Plus aria-hidden strokeWidth={2} />
            {t('addBreakText')}
          </Button>
        </span>
      )}
    </div>
  )
}
