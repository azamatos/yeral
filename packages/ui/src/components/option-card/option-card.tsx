import { RadioGroup } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A single choice between cards (booking → specialist step). Arrow keys move between options. */
export function OptionCardGroup({ className, ...props }: ComponentProps<typeof RadioGroup.Root>) {
  return <RadioGroup.Root {...props} className={cn('flex flex-col gap-3', className)} />
}

/** Selectable card (Booking `.opt`): leading media, title, caption, trailing; radio dot at the end. */
export function OptionCard({
  leading,
  title,
  caption,
  trailing,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Item>, 'title'> & {
  leading?: ReactNode
  title: ReactNode
  caption?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <RadioGroup.Item
      {...props}
      className={cn(
        'group flex w-full cursor-pointer items-center gap-4 rounded-card border border-n-200 bg-n-0 p-4 text-left text-n-900',
        'not-disabled:hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
        'data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:hover:bg-a-50',
        'disabled:cursor-not-allowed disabled:text-n-500',
        className,
      )}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-body font-semibold">{title}</span>
        {caption && <span className="text-dense text-n-600 group-disabled:text-n-500">{caption}</span>}
      </span>
      {trailing}
      <span
        aria-hidden
        className="size-5 flex-none rounded-pill border-[1.5px] border-n-400 bg-n-0 group-disabled:border-n-200 group-disabled:bg-n-50 group-data-[state=checked]:border-6 group-data-[state=checked]:border-a-500"
      />
    </RadioGroup.Item>
  )
}
