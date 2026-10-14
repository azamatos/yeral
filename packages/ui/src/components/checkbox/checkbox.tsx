import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const box = 'm-0 size-[18px] flex-none cursor-pointer accent-a-500 disabled:cursor-not-allowed'

/** Native checkbox, 18px, violet when checked (DS-Components → «Checkbox, radio, switch»). Without `label`, pass aria-label. */
export function Checkbox({ label, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label?: ReactNode }) {
  if (!label) return <input type="checkbox" {...props} className={cn(box, className)} />
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 text-body text-n-900 has-disabled:cursor-not-allowed has-disabled:text-n-500',
        className,
      )}
    >
      <input type="checkbox" {...props} className={box} />
      {label}
    </label>
  )
}

/** Native radio; group several with the same `name` inside a fieldset with a legend. */
export function Radio({ label, className, ...props }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode }) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 text-body text-n-900 has-disabled:cursor-not-allowed has-disabled:text-n-500',
        className,
      )}
    >
      <input type="radio" {...props} className={box} />
      {label}
    </label>
  )
}
