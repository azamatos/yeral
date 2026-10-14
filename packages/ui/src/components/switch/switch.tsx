import { Switch as SwitchPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/**
 * Switch (DS + Account-Profile `.sw`): 40×24 track inside a 52×44 touch area; on = a-500, off = n-200 with a
 * 1.5px n-500 inset border (≥ 3:1 against white). Label it with aria-label or aria-labelledby.
 */
export function Switch({ className, ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        'group inline-flex h-11 w-13 flex-none cursor-pointer items-center justify-center rounded-m border-0 bg-transparent p-0',
        'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <span className="relative h-6 w-10 rounded-pill bg-switch-off shadow-switch-off transition-colors group-data-[state=checked]:bg-switch-on group-data-[state=checked]:shadow-none">
        <SwitchPrimitive.Thumb className="absolute top-0.5 left-0.5 size-5 rounded-pill bg-n-0 shadow-knob transition-[left] duration-150 data-[state=checked]:left-4.5" />
      </span>
    </SwitchPrimitive.Root>
  )
}
