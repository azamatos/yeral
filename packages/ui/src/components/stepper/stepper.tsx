import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
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
  /** The furthest step reached (default `current`): a step after the current one up to it opens again on click. */
  reached?: number
  /**
   * horizontal: `m` the booking flow's header (22 markers, the current step underlined, «2/4 · Specialist» under 768);
   * `compact` a modal's steps (B-Team invite: 24 markers, 20 px separators, no underline, wrapping on phones).
   */
  size?: 'm' | 'compact'
  /**
   * Which steps open on click (default: every step up to `reached`); the others are disabled. The booking header keeps
   * a reached step closed once a change makes it stale (a new service drops the chosen time).
   */
  canOpen?: (index: number) => boolean
  /** vertical: the done check's accessible name («Done»). */
  doneLabel?: string
}

/**
 * Steps of a flow. Horizontal: the booking steps in the focused header (Booking `.stps`, `size="m"`): done steps are
 * links back (tint circle with a check), the current step has an ink circle and an a-500 underline, a step reached
 * before (after going back) opens again; under 768 it collapses to «2/4 · Specialist». The move mode's three steps
 * (Specialist · Time · Confirm) are the same header with other steps. `size="compact"`: a modal's steps (B-Team
 * invite), no underline, wrapping. Vertical: see `VerticalSteps`.
 */
export function Stepper({ orientation = 'horizontal', ...props }: StepperProps) {
  if (orientation === 'vertical') return <VerticalSteps {...props} />
  const { steps, current, onStepClick, 'aria-label': ariaLabel, className, reached = current, size = 'm', canOpen } = props
  const top = Math.max(reached, current)
  const opens = canOpen ?? ((i: number) => i <= top)
  const compact = size === 'compact'
  const list = (
    <ol className={cn('m-0 list-none p-0', compact ? 'flex flex-wrap items-center gap-2.5' : 'hidden items-stretch gap-3 sm:flex')}>
      {steps.map((label, i) => {
        const done = i < current
        const cur = i === current
        // reached before and gone back from: it opens again, as the steps before
        const ahead = i > current && opens(i)
        return (
          // each separator in its step's item, so a wrapped line never ends on one
          <li key={i} className={cn('flex gap-2.5', compact ? 'items-center' : 'items-stretch gap-3')}>
            {i > 0 && <span aria-hidden className={cn('h-px flex-none self-center bg-n-300', compact ? 'w-5' : 'w-4')} />}
            <button
              type="button"
              disabled={cur || !opens(i)}
              aria-current={cur ? 'step' : undefined}
              onClick={() => onStepClick?.(i)}
              className={cn(
                'group inline-flex items-center gap-2 border-0 bg-transparent text-small font-medium whitespace-nowrap text-n-500',
                'focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-default',
                compact
                  ? 'min-h-8 rounded-input pr-1.5 pl-0.5 leading-4.5 focus-visible:shadow-focus'
                  : 'border-b-2 border-transparent px-0.5 focus-visible:rounded-input',
                ((done && opens(i)) || ahead) && 'cursor-pointer text-n-900',
                cur && 'font-semibold text-n-900',
                cur && !compact && 'border-a-500',
              )}
            >
              <span
                className={cn(
                  'inline-flex flex-none items-center justify-center rounded-pill border border-n-300 text-micro font-bold text-n-500',
                  compact ? 'size-6' : 'size-5.5',
                  cur && 'border-n-900 bg-n-900 text-white',
                  done && 'border-a-line bg-a-50 text-a-600',
                  ahead && 'bg-n-0 text-n-900',
                )}
              >
                {done ? <Check className={compact ? 'size-3' : 'size-3.5'} strokeWidth={compact ? 3 : 2.5} /> : i + 1}
              </span>
              <span className={cn((done || ahead) && 'group-hover:underline')}>{label}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
  if (compact)
    return (
      <nav aria-label={ariaLabel} className={className}>
        {list}
      </nav>
    )
  return (
    <nav aria-label={ariaLabel} className={cn('flex h-full items-stretch', className)}>
      {list}
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
  canOpen,
  doneLabel,
}: Omit<StepperProps, 'orientation'>) {
  // a step before the current one is always done, whatever `reached` says
  const top = Math.max(reached, current)
  const opens = canOpen ?? ((i: number) => i <= top)
  return (
    <nav aria-label={ariaLabel} className={className}>
      <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
        {steps.map((label, i) => {
          const cur = i === current
          const done = i < top && !cur
          const vis = i === top && !cur
          const summary = done ? summaries?.[i] : undefined
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!cur && !opens(i)}
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
