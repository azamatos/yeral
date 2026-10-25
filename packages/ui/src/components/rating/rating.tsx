import { RadioGroup } from 'radix-ui'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** The board's sharp star: one shape for the stars shown and the stars picked. */
const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

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
      <polygon fill={`url(#${id})`} points={STAR_POINTS} />
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

const STAR_SIZE = { 12: 'size-3', 14: 'size-3.5', 16: 'size-4' } as const

/**
 * Five stars, partly filled (a reviews summary, a review), 12 / 14 / 16 (16 by default): filled ink, empty n-300; the
 * number is always written beside them too. Give it an accessible `label` such as «Average rating: 4.9 out of 5».
 */
export function Stars({
  rating,
  label,
  size = 16,
  className,
}: {
  rating: number
  label: string
  size?: keyof typeof STAR_SIZE
  className?: string
}) {
  return (
    <span role="img" aria-label={label} className={cn('inline-flex gap-0.5 text-n-900', className)}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} fill={Math.max(0, Math.min(1, rating - i))} className={STAR_SIZE[size]} />
      ))}
    </span>
  )
}

/**
 * RatingInput (DS-Patterns → «Rating input · 48 targets + word»; the review modal): five 48 star buttons as a radio
 * group (arrow keys move and pick), 32 stars, n-500 outlines until picked, ink filled up to the pick (or up to the one
 * under the pointer, as a preview), and the pick's word beside them («Poor … Excellent», 15/22 600 n-600, said as it
 * changes). The words come from the caller: `label` names the group, `starLabel(n)` each star («4 stars»), `words`
 * the five words. The word under the pointer is only seen; the picked one is said.
 */
export function RatingInput({
  value,
  onValueChange,
  label,
  starLabel,
  words,
  className,
}: {
  value: number | null
  onValueChange: (value: number) => void
  label: string
  starLabel: (stars: number) => string
  words?: readonly [string, string, string, string, string]
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <RadioGroup.Root
        aria-label={label}
        orientation="horizontal"
        // the ends stay put: a press past 5 never wraps round to 1
        loop={false}
        value={value ? String(value) : ''}
        onValueChange={(v) => {
          // a pick (by the keys too) shows itself, not a star the pointer happens to rest on
          setHover(null)
          onValueChange(Number(v))
        }}
        onPointerLeave={() => setHover(null)}
        className="flex items-center gap-1"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <RadioGroup.Item
            key={n}
            value={String(n)}
            aria-label={starLabel(n)}
            onPointerEnter={() => setHover(n)}
            className={cn(
              'inline-flex size-12 cursor-pointer items-center justify-center rounded-m border-0 bg-transparent p-0 text-n-500',
              'hover:bg-group focus-visible:shadow-focus focus-visible:outline-none',
              n <= shown && 'text-n-900',
            )}
          >
            <svg viewBox="0 0 24 24" aria-hidden className="size-8">
              <polygon
                points={STAR_POINTS}
                fill={n <= shown ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={1.75}
                strokeLinejoin="round"
              />
            </svg>
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
      {words && (
        <>
          {/* the preview's word is seen; the pick's word is said */}
          <span aria-hidden className="text-body font-semibold text-n-600">
            {shown ? words[shown - 1] : ''}
          </span>
          <span aria-live="polite" className="sr-only">
            {value ? words[value - 1] : ''}
          </span>
        </>
      )}
    </div>
  )
}
