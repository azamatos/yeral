import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../avatar'

const box = { 24: 'size-6 text-micro', 28: 'size-7 text-micro', 32: 'size-8 text-[14px]' } as const

/**
 * AvatarStack (DS-Patterns, B-Services «Who does it», B-Team): up to `max` faces overlapping by 8, each ringed in
 * white, then a neutral «+N» for the rest. A picture beside a name or a count that says it: hidden from screen readers.
 */
export function AvatarStack({
  people,
  max = 3,
  size = 28,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & {
  people: readonly { id: string; name: string; src?: string | null }[]
  max?: number
  size?: keyof typeof box
}) {
  const shown = people.slice(0, max)
  const more = people.length - shown.length
  const ring = 'shadow-[0_0_0_2px_var(--color-n-0)]'
  return (
    <span aria-hidden {...props} className={cn('flex flex-none', className)}>
      {shown.map((p, i) => (
        <Avatar key={p.id} name={p.name} src={p.src} size={size} decorative className={cn(ring, i > 0 && '-ml-2')} />
      ))}
      {more > 0 && (
        <span
          className={cn(
            'inline-flex flex-none items-center justify-center rounded-pill bg-n-100 font-semibold text-n-600 tabular-nums',
            box[size],
            ring,
            '-ml-2',
          )}
        >
          +{more}
        </span>
      )}
    </span>
  )
}
