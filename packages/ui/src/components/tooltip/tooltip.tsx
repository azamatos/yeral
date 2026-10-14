import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'

/** Short hint on hover/focus for icon-only controls. Needs UIProvider (shared delay). Never put essential info only here. */
export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-70 max-w-60 rounded-input bg-n-900 px-2.5 py-1.5 text-dense text-white data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
