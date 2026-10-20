import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Short hint on hover/focus for icon-only controls (DS-Patterns `.y-tip-ink`: ink, 12/16 500, r8, raised; up to 236
 * wide, wrapping). `label` is the rail's one-line name beside an icon (pad 4 8, 8 from the rail's button). Needs
 * UIProvider (shared delay). Never put essential info only here.
 */
export function Tooltip({
  content,
  side = 'top',
  variant = 'hint',
  children,
}: {
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  variant?: 'hint' | 'label'
  children: ReactNode
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={variant === 'label' ? 8 : 6}
          collisionPadding={8}
          className={cn(
            'z-70 rounded-input bg-n-900 text-micro font-medium text-white shadow-raised data-[state=delayed-open]:animate-fade-in',
            variant === 'label' ? 'px-2 py-1 whitespace-nowrap' : 'max-w-59 px-2.5 py-2',
          )}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
