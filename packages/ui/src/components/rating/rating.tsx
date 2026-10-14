import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

function Star({ fill = 1, className }: { fill?: number; className?: string }) {
  const id = `star-${Math.round(fill * 100)}`
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn('size-4 flex-none', className)}>
      <defs>
        <linearGradient id={id}>
          <stop offset={fill} stopColor="currentColor" />
          <stop offset={fill} stopColor="var(--color-n-300)" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#${id})`}
        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
      />
    </svg>
  )
}

/** «★ 4,9» in ink (Venue header, cards). `value` is already formatted for the locale (decimal comma). */
export function Rating({ value, count, className, ...props }: ComponentProps<'span'> & { value: ReactNode; count?: ReactNode }) {
  return (
    <span {...props} className={cn('inline-flex items-center gap-1 font-semibold text-n-900', className)}>
      <Star />
      {value}
      {count !== undefined && <span className="font-normal text-n-600">({count})</span>}
    </span>
  )
}

/** Five stars, partly filled (reviews summary). Give it an accessible `label` such as «Baha: 5-den 4,9». */
export function Stars({ rating, label, className }: { rating: number; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn('inline-flex gap-0.5 text-n-900', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, rating - i))} />
      ))}
    </span>
  )
}
