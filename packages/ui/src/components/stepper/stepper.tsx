import { Check } from 'lucide-react'
import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Booking steps in the focused header (Booking `.stps`): done steps are links back (tint circle with a check),
 * the current step has an ink circle and an a-500 underline. Under 768 it collapses to «2/4 · Hünärmen».
 */
export function Stepper({
  steps,
  current,
  onStepClick,
  'aria-label': ariaLabel,
  className,
}: {
  steps: ReactNode[]
  /** 0-based */
  current: number
  onStepClick?: (index: number) => void
  'aria-label': string
  className?: string
}) {
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
                    'focus-visible:rounded-input focus-visible:shadow-[inset_0_0_0_2px_var(--color-a-400)] focus-visible:outline-none disabled:cursor-default',
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
