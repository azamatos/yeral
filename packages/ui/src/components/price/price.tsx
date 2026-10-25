import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const price = cva('', {
  variants: {
    size: {
      /** a row's price slot, a detail line: 14/20 */
      inline: 'text-small',
      /** a summary card's total: 19/24 700, at the right */
      total: 'text-right text-[19px] leading-6 font-bold whitespace-nowrap',
      /** the action bar's total on phones: 17/22 700 */
      bar: 'text-body-l leading-5.5 font-bold whitespace-nowrap',
    },
    hidden: { true: 'text-n-600', false: 'text-n-900' },
  },
  compoundVariants: [
    { size: 'inline', hidden: false, class: 'font-semibold' },
    { size: 'inline', hidden: true, class: 'font-medium' },
    // a total with no amount to show says so in a quieter line that may wrap
    { size: ['total', 'bar'], hidden: true, class: 'text-body leading-5.5 font-semibold whitespace-normal' },
  ],
  defaultVariants: { size: 'inline', hidden: false },
})

/**
 * Price (DS-Patterns → «Price»): a price as the caller formats it (`fmt.price`: «60 TMT», «from 250 TMT», «Free»,
 * «Price at the place»), drawn by its place: a row's slot (ink 600), a summary card's total (19/24 700, at the right)
 * or the action bar's (17/22 700). A `hidden` price («Price at the place»: a hidden type, or a total of hidden ones
 * only, `priceTotal` in `@yeral/domain/pricing`) is quieter: n-600 500 in a slot, 15/22 600 n-600 as a total, wrapping.
 * It never makes up an amount: the text is the caller's.
 */
export function Price({
  hidden = false,
  size,
  className,
  ...props
}: ComponentProps<'span'> & {
  /** No amount to show («Price at the place»). */
  hidden?: boolean
  size?: 'inline' | 'total' | 'bar'
}) {
  return <span {...props} className={cn(price({ size, hidden }), className)} />
}
