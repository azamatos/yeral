import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const callout = cva('flex text-small [&_b]:font-semibold [&_b]:text-n-900 [&_strong]:font-semibold [&_strong]:text-n-900', {
  variants: {
    // one tone for the line, the fill and the icon (DS-Lists A10); the title is always ink and the body n-600
    tone: {
      neutral: 'border-n-200 bg-n-50 [&>[data-callout-icon]]:text-n-600',
      // «Info» on the board: violet
      accent: 'border-a-line bg-a-50 [&>[data-callout-icon]]:text-a-600',
      success: 'border-st-completed-line bg-st-completed-bg [&>[data-callout-icon]]:text-st-completed-ink',
      warning: 'border-st-pending-line bg-st-pending-bg [&>[data-callout-icon]]:text-st-pending-ink',
      danger: 'border-danger-line bg-error-tint [&>[data-callout-icon]]:text-danger-ink',
    },
    size: {
      m: "items-start gap-3 px-4 py-3.5 text-n-600 [&_[data-callout-icon]_svg:not([class*='size-'])]:size-5",
      // 40 high, one line 13/18 500 ink that truncates rather than wraps: the booking summary, a drawer, a 390 step
      compact: "h-10 items-center gap-2 px-3 text-dense font-medium text-n-900 [&_[data-callout-icon]_svg:not([class*='size-'])]:size-4",
    },
    layout: {
      box: 'rounded-ctl-l border',
      // full bleed above the page header: the tone's line only at the bottom, no radius, no dismiss
      banner: 'border-b px-6 py-3',
    },
    // one short action on the right: the row centres on it
    inline: { true: 'items-center' },
  },
  compoundVariants: [{ size: 'compact', layout: 'box', class: 'rounded-ctl-m' }],
  defaultVariants: { size: 'm' },
})

export type CalloutTone = NonNullable<VariantProps<typeof callout>['tone']>

/** The icon each tone draws when the screen names none (DS-Lists A10): info, check, triangle, circle alert. */
const TONE_ICON: Record<CalloutTone, ReactNode> = {
  neutral: <Info />,
  accent: <Info />,
  success: <CircleCheck />,
  warning: <TriangleAlert />,
  danger: <CircleAlert />,
}

export type CalloutProps = Omit<ComponentProps<'div'>, 'title'> &
  Omit<VariantProps<typeof callout>, 'layout' | 'inline'> & {
    /**
     * `box` (default) sits in the flow; `banner` is the full-width strip above a page header (owner preview, pad
     * 12 24, a bottom line instead of a box); `card` is the calm info card that replaces a booking card (white, n-200
     * line, r16, icon tile 44, title 19/24, body 15/22, `value` and `actions` stacked under it). `card` ignores
     * `tone`, `size` and `action`; `banner` is always M.
     */
    layout?: 'box' | 'banner' | 'card'
    /**
     * Lucide icon, 20 (M, banner), 16 (compact) or 22 in the card's tile, drawn in the tone's ink. Left out, the tone
     * draws its own (the board's «Bookings are confirmed at once» is Info with a zap); `null` for a text-only note.
     */
    icon?: ReactNode
    /** A line in 600 ink above the body («18 min left to answer»). For a bold start inside the sentence, put `<b>` in the children. */
    title?: ReactNode
    /** The element the title renders as: a heading level that fits the page (the card is drawn with an `h3`). */
    titleAs?: ElementType
    /** Secondary S buttons or links under the body, 8 apart (the card stacks them full width). */
    actions?: ReactNode
    /** One short action on the right of a one-line callout (S button «Allow»); the row centres on it. */
    action?: ReactNode
    /** Card only: the big value above the actions (the business's phone number, 22/28 700). */
    value?: ReactNode
    /**
     * The callout appeared or changed in answer to something (a failed load, a saved switch, a waiting request):
     * screen readers hear it — danger as `role="alert"`, every other tone (and the card) as `role="status"`. Static
     * notes are `role="note"` as the board draws them (`live={false}` for a static danger note). Defaults follow the
     * board: on for danger and the banner, off for the rest. A status is heard most reliably when it changes while
     * mounted, so a screen that must be heard keeps the Callout on screen and swaps its children.
     */
    live?: boolean
  }

/**
 * Callout — DS-Lists → 05 Callouts (A10): a 1 px line, a soft fill and an icon in one tone; the title ink 600, the
 * body n-600. Five tones: neutral (notes), accent = Info (violet: tips, «Bookings are confirmed at once»), success (it
 * worked), warning (in review, time running out), danger (hidden, failed). Sizes M (pad 14 16, icon 20) and compact
 * (40 high, one line). A page `banner` and the calm info `card` keep their older boards. No close button: a callout
 * stays while its fact is true. Every word comes in as props.
 */
export function Callout({
  tone,
  size,
  layout = 'box',
  icon,
  title,
  titleAs,
  actions,
  action,
  value,
  live,
  className,
  children,
  ...props
}: CalloutProps) {
  const t = tone ?? 'neutral'

  if (layout === 'card') {
    // the card is drawn calm whatever the tone: never an alert
    const Title = titleAs ?? 'h3'
    return (
      <div
        role={live ? 'status' : undefined}
        {...props}
        className={cn('flex flex-col gap-5 rounded-card border border-n-200 bg-n-0 p-6 text-n-900', className)}
      >
        <div className="flex flex-col gap-3.5">
          {icon && (
            <span
              aria-hidden
              className="flex size-11 flex-none items-center justify-center rounded-pill bg-group [&_svg:not([class*='size-'])]:size-5.5"
            >
              {icon}
            </span>
          )}
          {(title || children) && (
            <div className="flex flex-col gap-1.5">
              {title && <Title className="text-[19px] leading-6 font-bold tracking-[-0.01em] text-pretty">{title}</Title>}
              {children && <div className="text-body text-pretty text-n-600">{children}</div>}
            </div>
          )}
        </div>
        {(value || actions) && (
          <div className="flex flex-col gap-3">
            {value && <span className="text-[22px] leading-7 font-bold tracking-[-0.01em]">{value}</span>}
            {actions}
          </div>
        )}
      </div>
    )
  }

  const isLive = live ?? (t === 'danger' || layout === 'banner')
  const role = isLive ? (t === 'danger' ? 'alert' : 'status') : 'note'
  const drawnIcon = icon === undefined ? TONE_ICON[t] : icon
  const iconSlot = drawnIcon ? (
    <span data-callout-icon aria-hidden className="flex flex-none">
      {drawnIcon}
    </span>
  ) : null

  if (size === 'compact' && layout === 'box') {
    return (
      <div role={role} {...props} className={cn(callout({ tone: t, size, layout }), className)}>
        {iconSlot}
        <span className="min-w-0 flex-1 truncate">{children ?? title}</span>
        {action && <span className="flex flex-none">{action}</span>}
      </div>
    )
  }

  const Title = titleAs ?? 'p'
  return (
    <div
      role={role}
      {...props}
      className={cn(
        // the banner is always drawn at M (pad 12 24, icon 20)
        callout({ tone: t, size: 'm', layout, inline: Boolean(action) }),
        className,
      )}
    >
      {iconSlot}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <Title className="font-semibold text-n-900">{title}</Title>}
        {children && <div>{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
      {action && <div className="flex flex-none">{action}</div>}
    </div>
  )
}
