import { cva } from 'class-variance-authority'
import { RadioGroup } from 'radix-ui'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** A single choice between cards (booking → specialist step). Arrow keys move between options. */
export function OptionCardGroup({ className, ...props }: ComponentProps<typeof RadioGroup.Root>) {
  return <RadioGroup.Root {...props} className={cn('flex flex-col gap-3', className)} />
}

const card = cva(
  [
    'group flex w-full cursor-pointer rounded-card border border-n-200 bg-n-0 text-left text-n-900',
    'not-disabled:hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
    'data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:hover:bg-a-50',
    'disabled:cursor-not-allowed disabled:text-n-500',
  ],
  {
    variants: {
      layout: {
        // Booking `.opt`: the dot at the end
        end: 'items-center gap-4 p-4',
        // B-Onboarding `.rro`: the dot first
        start: 'items-start gap-3 rounded-m px-4 py-3.5',
        // B-Onboarding `.rcard`: stacked, the dot in the corner
        large: 'relative flex-col items-start gap-3.5 p-5',
      },
    },
  },
)

const radio = cva(
  // ring n-500 (≥ 3:1 against white; COMPONENTS.md: Booking drew n-400)
  'size-5 flex-none rounded-pill border-[1.5px] border-n-500 bg-n-0 group-disabled:border-n-200 group-disabled:bg-n-50 group-data-[state=checked]:border-6 group-data-[state=checked]:border-a-500',
  { variants: { layout: { end: '', start: 'mt-px', large: 'absolute top-5 right-5' } } },
)

const titleText = cva('font-semibold', {
  variants: {
    layout: {
      end: 'text-body',
      start: 'text-button group-data-[state=checked]:text-a-600 group-disabled:text-n-500',
      large: 'pr-7 text-[16px] leading-[22px]',
    },
  },
})

type Common = Omit<ComponentProps<typeof RadioGroup.Item>, 'title'> & {
  leading?: ReactNode
  /** A decorative 44 icon tile: grey, white with the accent ink once checked. */
  icon?: ReactNode
  /** The card's name; the caption and `trailing` describe it. */
  title: ReactNode
  /** A small outlined pill after the title («Recommended»). */
  tag?: ReactNode
  caption?: ReactNode
  trailing?: ReactNode
}

/**
 * Selectable card. `m` (Booking `.opt`): leading media, title, caption, trailing; the radio dot at the end, or at the
 * start with `indicator="start"` (B-Onboarding `.rro`, «Who answers requests?»). `l` (B-Onboarding `.rcard`, the
 * wizard's big choices): the icon tile on top, the title with its `tag` («Recommended»), the caption, then `trailing`
 * under them («Client sees …»); the radio dot in the top right corner. The title (and tag) name the radio; the
 * caption and `trailing` are its description.
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
}: Common & ({ size?: 'm'; indicator?: 'end' | 'start' } | { size: 'l'; indicator?: never })) {
  const ids = useId()
  const layout = size === 'l' ? 'large' : indicator
  const titleId = `${ids}-title`
  const captionId = caption ? `${ids}-caption` : undefined
  const trailingId = trailing ? `${ids}-trailing` : undefined
  const describedBy = [captionId, trailingId].filter(Boolean).join(' ') || undefined
  const dot = <span aria-hidden className={radio({ layout })} />
  return (
    <RadioGroup.Item aria-labelledby={titleId} aria-describedby={describedBy} {...props} className={cn(card({ layout }), className)}>
      {layout === 'start' && dot}
      {icon && (
        <span className="flex size-11 flex-none items-center justify-center rounded-pill bg-n-100 text-n-900 group-disabled:bg-n-100 group-disabled:text-n-500 group-data-[state=checked]:bg-n-0 group-data-[state=checked]:text-a-600 [&_svg]:size-5.5">
          {icon}
        </span>
      )}
      {leading}
      <span className={cn('flex min-w-0 flex-col', layout === 'large' ? 'gap-1' : 'flex-1 gap-0.5')}>
        <span id={titleId} className={cn(titleText({ layout }), tag && 'flex flex-wrap items-center gap-2')}>
          {title}
          {tag && (
            <span className="inline-flex h-5.5 items-center rounded-pill border border-a-line bg-n-0 px-2 text-micro font-semibold whitespace-nowrap text-a-600 group-disabled:border-n-200 group-disabled:text-n-500">
              {tag}
            </span>
          )}
        </span>
        {caption && (
          <span id={captionId} className="text-dense text-n-600 group-disabled:text-n-500">
            {caption}
          </span>
        )}
      </span>
      {trailing && <span id={trailingId}>{trailing}</span>}
      {layout !== 'start' && dot}
    </RadioGroup.Item>
  )
}
