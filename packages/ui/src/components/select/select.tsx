import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

const sizes = {
  // 48: forms (DS `.inp`)
  l: { select: 'h-12 pr-10', chevron: 'top-3.5 right-3.5 size-5' },
  // 44: settings rows and drawers (DS `.i44`)
  m: { select: 'h-11 pr-10 text-small', chevron: 'top-1/2 right-3 size-4.5 -translate-y-1/2' },
  // 40: time pickers (DS `.y-tsel`)
  s: { select: 'h-10 pr-7 pl-3 text-small', chevron: 'top-1/2 right-2 size-4 -translate-y-1/2' },
}

/**
 * Native select for fewer than 8 options (DS-Components → Inputs → Etrap; DS-Patterns → Select): 48, 44 or 40 high.
 * `tabular` sets tabular figures where pickers stand in a column and their times must line up (TimeRangeField);
 * elsewhere the figures stay proportional, as Onest's tabular «1» leaves a gap in «10 min». `className` sizes the box
 * (a width). Longer lists use a searchable picker.
 */
export function Select({
  className,
  invalid,
  size = 'l',
  tabular,
  children,
  ...props
}: Omit<ComponentProps<'select'>, 'size'> & { invalid?: boolean; size?: keyof typeof sizes; tabular?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <select
        {...props}
        {...useControlProps({ ...props, invalid })}
        className={cn(inputClass, 'cursor-pointer appearance-none disabled:cursor-default', tabular && 'tabular-nums', sizes[size].select)}
      >
        {children}
      </select>
      <ChevronDown aria-hidden strokeWidth={1.75} className={cn('pointer-events-none absolute text-n-600', sizes[size].chevron)} />
    </div>
  )
}
