import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ElementType, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const callout = cva('flex text-small text-n-900 [&_b]:font-semibold [&_strong]:font-semibold', {
  variants: {
    tone: {
      // neutral: a quiet note on the group grey, no line (B-Settings .note, Account .dnote win over the bordered drafts)
      neutral: 'border-transparent bg-group',
      accent: 'border-a-line bg-a-50',
      warning: 'border-st-pending-line bg-st-pending-bg text-st-pending-ink',
      danger: 'border-danger-line bg-error-tint text-danger-ink',
      success: 'border-st-completed-line bg-st-completed-bg text-st-completed-ink',
      slate: 'border-st-cancelled-line bg-st-cancelled-bg text-st-cancelled-ink',
    },
    size: {
      m: "gap-3 px-4 py-3.5 [&_[data-callout-icon]_svg:not([class*='size-'])]:size-5",
      s: "gap-2.5 px-3.5 py-3 [&_[data-callout-icon]_svg:not([class*='size-'])]:size-4.5",
    },
    layout: {
      box: 'items-start rounded-m border',
      // full bleed above the page header: the tone's line only at the bottom, no radius, no dismiss
      banner: 'items-start border-b px-6 py-3',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'm', layout: 'box' },
})

// the icon keeps a little colour of its own on the two inky tones; the others draw it in the text colour
const iconTone: Record<CalloutTone, string> = {
  neutral: 'text-n-600',
  accent: 'text-a-600',
  warning: '',
  danger: '',
  success: '',
  slate: '',
}

export type CalloutTone = NonNullable<VariantProps<typeof callout>['tone']>

export type CalloutProps = Omit<ComponentProps<'div'>, 'title'> &
  Omit<VariantProps<typeof callout>, 'layout'> & {
    /**
     * `box` (default) sits in the flow; `banner` is the full-width strip above a page header (owner preview, pad
     * 12 24, a bottom line instead of a box); `card` is the calm info card that replaces a booking card (white, n-200
     * line, r16, icon tile 44, title 19/24, body 15/22, `value` and `actions` stacked under it). `card` ignores
     * `tone` and `size`.
     */
    layout?: 'box' | 'banner' | 'card'
    /** Lucide icon, 20 (M, banner), 18 (S) or 22 in the card's tile. No icon, no space for one. */
    icon?: ReactNode
    /** A line in 600 above the text («18 min left to answer»). For a bold start inside the sentence, put `<b>` in the children. */
    title?: ReactNode
    /** The element the title renders as: a heading level that fits the page (the card is drawn with an `h3`). */
    titleAs?: ElementType
    /** S buttons or links under the text (the card stacks them full width). */
    actions?: ReactNode
    /** One short action on the right of a one-line callout (S button «Allow»); the row centres on it. */
    action?: ReactNode
    /** Card only: the big value above the actions (the business's phone number, 22/28 700). */
    value?: ReactNode
    /**
     * The callout appeared or changed in answer to something (a failed load, a saved switch, a waiting request):
     * screen readers hear it — danger as `role="alert"`, every other tone as `role="status"`. Static notes stay
     * silent. Defaults to on for danger and for the banner, off for the rest.
     */
    live?: boolean
  }

/**
 * Callout — DS-Patterns → 02 Feedback → «Callout · tones, sizes, actions». A tinted note in the flow (`box`), a page
 * banner, or a calm info card. Six tones: neutral (notes), accent (tips), warning (pending, time running out), danger
 * (errors), success (it worked), slate (something cancelled). No dismiss: no screen closes a callout. Every word comes
 * in as props.
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
  const isLive = live ?? (t === 'danger' || layout === 'banner')
  const role = isLive ? (t === 'danger' ? 'alert' : 'status') : undefined

  if (layout === 'card') {
    const Title = titleAs ?? 'h3'
    return (
      <div role={role} {...props} className={cn('flex flex-col gap-5 rounded-card border border-n-200 bg-n-0 p-6 text-n-900', className)}>
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
            {value && <span className="text-[22px] leading-7 font-bold tracking-[-0.01em] tabular-nums">{value}</span>}
            {actions}
          </div>
        )}
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
        callout({ tone: t, size: layout === 'banner' ? 'm' : size, layout }),
        layout === 'box' && action && 'items-center',
        className,
      )}
    >
      {icon && (
        <span data-callout-icon aria-hidden className={cn('flex flex-none', !(layout === 'box' && action) && 'mt-px', iconTone[t])}>
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title && <Title className="font-semibold">{title}</Title>}
        {children && <div>{children}</div>}
        {actions && <div className="flex flex-wrap gap-2 pt-2">{actions}</div>}
      </div>
      {action && <div className="flex flex-none">{action}</div>}
    </div>
  )
}
