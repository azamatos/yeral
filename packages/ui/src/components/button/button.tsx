import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from '../spinner'

/**
 * Buttons from DS-Components → Buttons. One `primary` per view; `ink` only for the header search button and store
 * buttons; `danger-solid` only for the final destructive confirm in a modal.
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap border border-transparent font-semibold no-underline',
    'transition-[background,box-shadow,transform,border-color] duration-[120ms,120ms,60ms,120ms]',
    'focus-visible:shadow-focus focus-visible:outline-none active:translate-y-px',
    // DS-Components `.b:disabled` for every variant; `bg-none` drops the primary's gradient (a background image the
    // colour alone doesn't cover), and the disabled rules sort after hover and active, so neither brings it back
    'disabled:cursor-not-allowed disabled:translate-y-0 disabled:border-n-100 disabled:bg-n-100 disabled:bg-none disabled:text-n-500 disabled:shadow-none',
    "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-white shadow-primary hover:bg-primary-hover focus-visible:shadow-primary-focus active:bg-primary-active active:shadow-primary-active',
        secondary: 'border-n-300 bg-n-0 text-n-900 hover:border-n-400 hover:bg-n-50 active:bg-n-100',
        ghost: 'bg-transparent text-n-900 hover:bg-group',
        tint: 'border-a-line bg-a-50 text-a-600 hover:bg-a-100',
        danger: 'border-danger-line bg-n-0 text-danger-ink hover:bg-error-tint',
        /** a quiet destructive action beside others: "Leave this business", "Cancel booking" in a drawer's footer */
        'danger-ghost': 'bg-transparent text-danger-ink hover:bg-error-tint',
        'danger-solid': 'bg-danger-solid text-white hover:bg-danger-solid-hover',
        ink: 'bg-ink-btn text-white hover:bg-ink-btn-hover',
        // the on-ink set (DS-Patterns → Button «On ink · bulk bar, toast, move bar»): white, outline n-600, clear;
        // disabled on ink keeps the transparent fill with an n-600 line and n-500 text
        'inverse-solid': 'bg-n-0 text-n-900 hover:bg-n-100 disabled:border-n-600 disabled:bg-transparent disabled:text-n-500',
        'inverse-outline':
          'border-n-600 bg-transparent text-white hover:bg-ink-btn-hover disabled:border-n-600 disabled:bg-transparent disabled:text-n-500',
        'inverse-ghost':
          'bg-transparent text-white hover:bg-ink-btn-hover disabled:border-transparent disabled:bg-transparent disabled:text-n-500',
      },
      size: {
        s: "h-9 min-w-18 rounded-s px-3.5 text-small [&_svg:not([class*='size-'])]:size-4",
        m: 'h-11 min-w-22 rounded-m px-4.5 text-button',
        l: "h-13 min-w-22 rounded-l px-6 text-button-l [&_svg:not([class*='size-'])]:size-5",
      },
      iconOnly: { true: "min-w-0 px-0 [&_svg:not([class*='size-'])]:size-5" },
    },
    compoundVariants: [
      { iconOnly: true, size: 's', class: "w-9 [&_svg:not([class*='size-'])]:size-4" },
      { iconOnly: true, size: 'm', class: 'w-11' },
      { iconOnly: true, size: 'l', class: 'w-13' },
    ],
    defaultVariants: { variant: 'secondary', size: 'm', iconOnly: false },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Render the child element (a link) with button styles. */
    asChild?: boolean
    /** Keeps the variant and the width, swaps the label for a spinner, ignores clicks. */
    loading?: boolean
    /** Accessible name while loading (e.g. «Ýüklenýär»). */
    loadingLabel?: string
    /** Words beside the spinner while loading («Sending…», «Checking…»): the label reads them; the width follows them. */
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
      aria-label={loading && loadingLabel ? loadingLabel : props['aria-label']}
      onClick={(e) => {
        if (loading) e.preventDefault()
        else onClick?.(e)
      }}
      className={cn(buttonVariants({ variant, size, iconOnly }), loading && 'cursor-progress active:translate-y-0', className)}
    >
      {loading && loadingText ? (
        <>
          <Spinner />
          {loadingText}
        </>
      ) : loading ? (
        <>
          <span className="invisible inline-flex items-center gap-2" aria-hidden>
            {children}
          </span>
          <Spinner className="absolute" />
        </>
      ) : (
        children
      )}
    </Comp>
  )
}
