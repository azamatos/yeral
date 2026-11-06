import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from '../spinner'

/**
 * Buttons from DS · Controls (v0.7 · A4): every action has a box at rest. One `primary` per view; `secondary` for the
 * rest; `tertiary` (grey fill, no border) for low priority; `danger-quiet` for a destructive step that still confirms;
 * `danger-solid` only for the final confirm in a modal; `ink` only for the header search button and store buttons;
 * `plain` only for an icon-only button in rows and toolbars (`IconButton variant="plain"`). Sizes S 32 / M 40 / L 48
 * (A3): business toolbars and forms M, client forms and 390 L. `ghost` and `danger-ghost` are retired.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap border border-transparent font-semibold no-underline',
    'transition-[background,box-shadow,transform,border-color] duration-[120ms,120ms,60ms,120ms]',
    'focus-visible:shadow-focus focus-visible:outline-none active:translate-y-px',
    // disabled is the same for every boxed variant: n-100 fill, n-400 text and icon, no border, no shadow; `bg-none`
    // drops the primary's gradient, and the disabled rules sort after hover and active, so neither brings it back
    'disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-transparent disabled:bg-n-100 disabled:bg-none disabled:text-n-400 disabled:shadow-none',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-primary hover:bg-primary-hover focus-visible:shadow-primary-focus active:bg-primary-active active:shadow-primary-active',
        secondary: 'border-n-300 bg-n-0 text-n-900 hover:border-n-400 hover:bg-n-50 active:bg-n-100',
        tertiary: 'bg-n-100 text-n-900 hover:bg-n-200 active:bg-n-300',
        tint: 'border-a-line bg-a-50 text-a-600 hover:bg-a-100',
        'danger-quiet': 'border-danger-line bg-n-0 text-danger-ink hover:bg-error-tint active:bg-danger-line',
        'danger-solid': 'bg-danger-solid text-white hover:bg-danger-solid-hover active:bg-danger-solid-hover',
        ink: 'bg-ink-btn text-white hover:bg-ink-btn-hover',
        /** the plain IconButton: icon n-600, no box at rest, a fill on hover; disabled keeps no fill */
        plain: 'bg-transparent text-n-600 hover:bg-n-100 hover:text-n-900 active:bg-n-200 active:text-n-900 disabled:bg-transparent',
        // the on-ink set (DS-Patterns → Button «On ink · bulk bar, toast, move bar»): white, outline n-600, clear;
        // disabled on ink keeps the transparent fill with an n-600 line and n-500 text
        'inverse-solid': 'bg-n-0 text-n-900 hover:bg-n-100 disabled:border-n-600 disabled:bg-transparent disabled:text-n-500',
        'inverse-outline':
          'border-n-600 bg-transparent text-white hover:bg-ink-btn-hover disabled:border-n-600 disabled:bg-transparent disabled:text-n-500',
        'inverse-ghost':
          'bg-transparent text-white hover:bg-ink-btn-hover disabled:border-transparent disabled:bg-transparent disabled:text-n-500',
      },
      // height · side padding · radius · text · icon → gap: S 32 · 12 · 8 · 13/16 · 16 → 6; M 40 · 16 · 10 · 14/20 · 18 → 8;
      // L 48 · 20 · 12 · 15/20 · 20 → 8 (the side padding is always larger than the top and bottom)
      size: {
        s: "h-8 gap-1.5 rounded-ctl-s px-3 text-ctl-s/4 [&_svg:not([class*='size-'])]:size-4",
        m: "h-10 gap-2 rounded-ctl-m px-4 text-ctl-m/5 [&_svg:not([class*='size-'])]:size-4.5",
        l: "h-12 gap-2 rounded-ctl-l px-5 text-[15px]/5 [&_svg:not([class*='size-'])]:size-5",
      },
      /** square (32 / 40 / 48); needs `aria-label` — prefer `IconButton`, which adds the tooltip */
      iconOnly: { true: 'px-0' },
    },
    compoundVariants: [
      { iconOnly: true, size: 's', class: 'w-8' },
      { iconOnly: true, size: 'm', class: 'w-10' },
      { iconOnly: true, size: 'l', class: 'w-12' },
    ],
    defaultVariants: { variant: 'secondary', size: 'm', iconOnly: false },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (a link) with button styles. */
    asChild?: boolean
    /**
     * Keeps the variant and the label, ignores clicks; a 16 px spinner takes the leading icon's place, so the width
     * doesn't change. A button without an icon gets the spinner left of the label: give one that can load (Save, Send)
     * a `min-w-*` equal to its loading width so nothing beside it moves.
     */
    loading?: boolean
    /** Accessible name while loading (e.g. «Ýüklenýär»). */
    loadingLabel?: string
    /** Words beside the spinner while loading («Sending…», «Checking…») in place of the label. */
    loadingText?: ReactNode
  }

export function Button({
  className,
  variant,
  size,
  iconOnly,
  asChild,
  loading,
  loadingLabel,
  loadingText,
  disabled,
  children,
  type,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      {...props}
      type={asChild ? undefined : (type ?? 'button')}
      disabled={asChild ? undefined : disabled}
      aria-busy={loading || undefined}
      // a caller's own `aria-disabled` (a trigger that stays focusable while off) stands too
      aria-disabled={loading || props['aria-disabled'] || undefined}
      // while loading the visible label stays part of the name; it is replaced only when nothing visible is left
      aria-label={loading && loadingLabel && (iconOnly || loadingText) ? loadingLabel : props['aria-label']}
      onClick={(e) => {
        if (loading) e.preventDefault()
        else onClick?.(e)
      }}
      className={cn(buttonVariants({ variant, size, iconOnly }), loading && 'cursor-progress active:translate-y-0', className)}
    >
      {loading ? (
        <>
          {/* the spinner takes the icon's size (16 / 18 / 20), so the width stays */}
          <Spinner className={(size ?? 'm') === 's' ? 'size-4' : size === 'l' ? 'size-5' : 'size-4.5'} />
          {loadingText ?? (
            // the label stays; the leading icon gives its place to the spinner
            <span className="contents [&>svg:first-child]:hidden">{iconOnly ? null : children}</span>
          )}
          {loadingLabel && !iconOnly && !loadingText && <span className="sr-only">{loadingLabel}</span>}
        </>
      ) : (
        children
      )}
    </Comp>
  )
}
