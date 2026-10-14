import { ChevronDown } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

/** Native select for fewer than 8 options (DS-Components → Inputs → Etrap). Longer lists use a searchable picker. */
export function Select({ className, invalid, children, ...props }: ComponentProps<'select'> & { invalid?: boolean }) {
  return (
    <div className={cn('relative', className)}>
      <select
        {...props}
        {...useControlProps({ ...props, invalid })}
        className={cn(inputClass, 'h-12 cursor-pointer appearance-none pr-10')}
      >
        {children}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute top-3.5 right-3.5 size-5 text-n-600" />
    </div>
  )
}
