import { RadioGroup } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A single choice between cards (booking → specialist step). Arrow keys move between options. */
export function OptionCardGroup({ className, ...props }: ComponentProps<typeof RadioGroup.Root>) {
  return <RadioGroup.Root {...props} className={cn('flex flex-col gap-3', className)} />
}

/**
 * Selectable card. `m` (Booking `.opt`): leading media, title, caption, trailing; the radio dot at the end, or at the
 * start with `indicator="start"` (B-Onboarding `.rro`, «Who answers requests?»). `l` (B-Onboarding `.rcard`, the
 * wizard's big choices): the icon tile on top, the title with its `tag` («Recommended»), the caption, then `trailing`
 * under them («Client sees …»); the radio dot in the top right corner.
 */
export function OptionCard({
  leading,
  icon,
  title,
  tag,
  caption,
  trailing,
  size = 'm',
  indicator = 'end',
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Item>, 'title'> & {
  leading?: ReactNode
  /** A decorative 44 icon tile: grey, white with the accent ink once checked. */
  icon?: ReactNode
  title: ReactNode
  /** A small outlined pill after the title («Recommended»). */
  tag?: ReactNode
  caption?: ReactNode
  trailing?: ReactNode
  size?: 'm' | 'l'
  /** Where the radio dot sits on an `m` card; an `l` card has it in the corner. */
  indicator?: 'end' | 'start'
}) {
  const large = size === 'l'
  const start = !large && indicator === 'start'
  const radio = (
    <span
      aria-hidden
      className={cn(
        'size-5 flex-none rounded-pill border-[1.5px] border-n-400 bg-n-0 group-disabled:border-n-200 group-disabled:bg-n-50 group-data-[state=checked]:border-6 group-data-[state=checked]:border-a-500',
        large && 'absolute top-5 right-5',
        start && 'mt-px',
      )}
    />
  )
  return (
    <RadioGroup.Item
      {...props}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-4 rounded-card border border-n-200 bg-n-0 p-4 text-left text-n-900',
        'not-disabled:hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
        'data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:hover:bg-a-50',
        'disabled:cursor-not-allowed disabled:text-n-500',
        large && 'relative flex-col items-start gap-3.5 p-5',
        start && 'items-start gap-3 rounded-m px-4 py-3.5',
        className,
      )}
    >
      {start && radio}
      {icon && (
        <span className="flex size-11 flex-none items-center justify-center rounded-pill bg-n-100 text-n-900 group-data-[state=checked]:bg-n-0 group-data-[state=checked]:text-a-600 [&_svg]:size-5.5">
          {icon}
        </span>
      )}
      {leading}
      <span className={cn('flex min-w-0 flex-col', large ? 'gap-1' : 'flex-1 gap-0.5')}>
        <span
          className={cn(
            'flex flex-wrap items-center gap-2 font-semibold',
            large ? 'pr-7 text-[16px] leading-[22px]' : start ? 'text-button group-data-[state=checked]:text-a-600' : 'text-body',
          )}
        >
          {title}
          {tag && (
            <span className="inline-flex h-5.5 items-center rounded-pill border border-a-line bg-n-0 px-2 text-micro font-semibold whitespace-nowrap text-a-600">
              {tag}
            </span>
          )}
        </span>
        {caption && <span className="text-dense text-n-600 group-disabled:text-n-500">{caption}</span>}
      </span>
      {trailing}
      {!start && radio}
    </RadioGroup.Item>
  )
}
