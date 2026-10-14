import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/** Loading placeholder for content (lists use skeletons, not spinners). Size it with classes. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden {...props} className={cn('animate-pulse rounded-input bg-n-100', className)} />
}
