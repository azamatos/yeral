import { Check } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type StepperProps = {
  steps: ReactNode[]
  /** 0-based */
  current: number
  onStepClick?: (index: number) => void
  'aria-label': string
  className?: string
  /**
   * `horizontal` (default): the booking flow's header. `vertical`: the setup wizard's step list (B-Onboarding aside),
   * each done step with a summary line. On phones the wizard shows a ProgressBar instead of the vertical list.
   */
  orientation?: 'horizontal' | 'vertical'
  /** vertical: a line under each done step («Glow Studio · Beauty»); clamped to two lines. */
  summaries?: ReactNode[]
  /** vertical: the furthest step reached (default `current`); a step after the current one up to it shows as reachable. */
  reached?: number
  /** vertical: which steps open on click (default: those before the current one); the others are disabled. */
  canOpen?: (index: number) => boolean
  /** vertical: the done check's accessible name («Done»). */
  doneLabel?: string
}

/**
 * Steps of a flow. Horizontal: the booking steps in the focused header (Booking `.stps`): done steps are links back
 * (tint circle with a check), the current step has an ink circle and an a-500 underline; under 768 it collapses to
 * «2/4 · Hünärmen». Vertical: see `VerticalSteps`.
 */
export function Stepper({ orientation = 'horizontal', ...props }: StepperProps) {
  if (orientation === 'vertical') return <VerticalSteps {...props} />
  const { steps, current, onStepClick, 'aria-label': ariaLabel, className } = props
  return (
    <nav aria-label={ariaLabel} className={cn('flex h-full items-stretch', className)}>
      <ol className="m-0 hidden list-none items-stretch gap-3 p-0 sm:flex">
        {steps.map((label, i) => {
          const done = i < current
          const cur = i === current
          return (
            <Fragment key={i}>
              {i > 0 && <li aria-hidden className="h-px w-4 flex-none self-center bg-n-300" />}
              <li className="flex items-stretch">
                <button
                  type="button"
                  disabled={!done}
                  aria-current={cur ? 'step' : undefined}
                  onClick={() => onStepClick?.(i)}
                  className={cn(
                    'group inline-flex items-center gap-2 border-0 border-b-2 border-transparent bg-transparent px-0.5 text-small font-medium whitespace-nowrap text-n-500',
                    'focus-visible:rounded-input focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-default',
                    done && 'cursor-pointer text-n-900',
                    cur && 'border-a-500 font-semibold text-n-900',
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex size-5.5 flex-none items-center justify-center rounded-pill border border-n-300 text-micro font-bold text-n-500',
                      cur && 'border-n-900 bg-n-900 text-white',
                      done && 'border-a-line bg-a-50 text-a-600',
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                  </span>
                  <span className={cn(done && 'group-hover:underline')}>{label}</span>
                </button>
              </li>
            </Fragment>
          )
        })}
      </ol>
      <span className="inline-flex items-center text-small font-semibold text-n-900 sm:hidden">
        <span className="mr-1.5 font-medium text-n-500">
          {current + 1}/{steps.length}
        </span>
        · {steps[current]}
      </span>
    </nav>
  )
}

/**
 * The setup wizard's step list (DS-Patterns → Stepper «vertical with summaries»; B-Onboarding `.sl .st`): rows 10 12,
 * r12, a 28 marker and the step's name 15/20. Done: tint marker with a check, ink text, the summary 13/18 n-600 under
 * it, hover n-100. The current step: a white row with a 1 px n-200 ring, an a-500 marker, the name 600. Reached but not
 * done: a white marker with an n-300 line. Not reached: n-100 marker, n-500 text. Rows the wizard can't open are
 * disabled buttons.
 */
function VerticalSteps({
  steps,
  current,
  onStepClick,
  'aria-label': ariaLabel,
  className,
  summaries,
  reached = current,
  canOpen = (i) => i < current,
  doneLabel,
}: Omit<StepperProps, 'orientation'>) {
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {steps.map((label, i) => {
          const cur = i === current
          const done = i < reached && !cur
          const vis = i === reached && !cur
          const summary = done ? summaries?.[i] : undefined
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!cur && !canOpen(i)}
                aria-current={cur ? 'step' : undefined}
                onClick={() => {
                  if (!cur) onStepClick?.(i)
                }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-m border-0 bg-transparent px-3 py-2.5 text-left text-n-500',
                  'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default',
                  (done || vis) && 'text-n-900 enabled:cursor-pointer enabled:hover:bg-n-100',
                  cur && 'cursor-default bg-n-0 text-n-900 shadow-[0_0_0_1px_var(--color-n-200)]',
                )}
              >
                <span
                  className={cn(
                    'inline-flex size-7 flex-none items-center justify-center rounded-pill border border-n-200 bg-n-100 text-dense font-bold text-n-500 tabular-nums',
                    done && 'border-a-line bg-a-50 text-a-600',
                    vis && 'border-n-300 bg-n-0 text-n-900',
                    cur && 'border-a-500 bg-a-500 text-white',
                  )}
                >
                  {done ? (
                    <Check
                      className="size-3.5"
                      strokeWidth={2.25}
                      role={doneLabel ? 'img' : undefined}
                      aria-label={doneLabel}
                      aria-hidden={doneLabel ? undefined : true}
                    />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <span className={cn('text-button font-medium', cur && 'font-semibold')}>{label}</span>
                  {summary && <span className="line-clamp-2 text-dense text-n-600">{summary}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
