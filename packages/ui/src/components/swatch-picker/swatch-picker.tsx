import { Check } from 'lucide-react'
import { RadioGroup } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export type Swatch = { value: string; label: string; color: string }

/**
 * SwatchPicker (DS-Patterns «Selection», B-Settings `.swg`): one colour out of a few, a 30 dot in a 44 button; the
 * chosen one has the ink selection ring and a white check 14, focus the violet ring. Arrow keys move between them.
 * `color` paints the dot; `label` names it («Violet»). Name the group with `aria-labelledby` or `aria-label`.
 */
export function SwatchPicker({
  options,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Root>, 'children' | 'orientation'> & { options: readonly Swatch[] }) {
  return (
    <RadioGroup.Root {...props} orientation="horizontal" className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.label}
          className="group inline-flex size-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent p-0 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span
            className="inline-flex size-7.5 items-center justify-center rounded-pill text-n-0 group-data-[state=checked]:shadow-ring-selected"
            style={{ background: o.color }}
          >
            <RadioGroup.Indicator>
              <Check aria-hidden strokeWidth={2.5} className="size-3.5" />
            </RadioGroup.Indicator>
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
