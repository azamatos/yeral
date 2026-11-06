import type { ReactNode } from 'react'
import { Tooltip } from '../tooltip'
import { Button, type ButtonProps } from './button'

/**
 * Icon-only button (DS · Controls · A4): square 32 / 40 / 48 with the icon 16 / 18 / 20, always named by `label`,
 * which is the accessible name and the tooltip on hover and focus. `outline` is the secondary look (standalone);
 * `plain` has no box at rest (in rows and toolbars). Needs UIProvider (the tooltip's shared delay).
 */
export function IconButton({
  label,
  variant = 'outline',
  tooltipSide,
  children,
  ...props
}: Omit<ButtonProps, 'variant' | 'iconOnly' | 'aria-label' | 'loadingText'> & {
  label: string
  variant?: 'outline' | 'plain'
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}) {
  return (
    <Tooltip content={label} side={tooltipSide} variant="label">
      <Button {...props} variant={variant === 'plain' ? 'plain' : 'secondary'} iconOnly aria-label={label}>
        {children}
      </Button>
    </Tooltip>
  )
}
