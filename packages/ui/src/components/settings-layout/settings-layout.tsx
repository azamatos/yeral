import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode, Ref } from 'react'
import { cn } from '../../lib/cn'

/**
 * SettingsLayout (B-Settings `.setl`, DS-Business «Settings navigation»): the settings' own menu beside the section
 * that's open. From 1024 the 240 menu stays put (sticky 24 from the top) with 40 between it and the section; under 1024
 * the menu is a row of chips above the section that scrolls sideways, edge to edge of the page's padding. `nav` is the
 * <SettingsNav>; the children are the section: a <SettingsPane>, and beside it whatever the section shows next to its
 * form (the booking rules' client preview), which wraps under it when there's no room.
 */
export function SettingsLayout({ nav, className, children, ...props }: ComponentProps<'div'> & { nav: ReactNode }) {
  return (
    <div {...props} className={cn('flex flex-col gap-5 md:flex-row md:items-start md:gap-10', className)}>
      {nav}
      <div className="flex w-full min-w-0 flex-wrap items-start gap-8 md:w-auto md:flex-1">{children}</div>
    </div>
  )
}

/**
 * The settings menu (`.snav`): 240, items 2 apart; under 1024 a chip row 8 apart that scrolls sideways (4 above and
 * below, so a chip's focus ring isn't cut). On the board the row reaches the page's edges: the page gives the classes
 * that undo its own padding (`max-md:-mx-6 max-md:px-6`). `aria-label` names it: «Settings sections».
 */
export function SettingsNav({ className, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      {...props}
      className={cn(
        'flex flex-none gap-2 overflow-x-auto py-1',
        'md:sticky md:top-6 md:w-60 md:flex-col md:gap-0.5 md:overflow-visible md:py-0',
        className,
      )}
    />
  )
}

/**
 * A section in the menu: from 1024 the sidebar's item (`.sn`: 40 high, 14/500, r10, icon 20; the open one in tint,
 * 600), under 1024 a 44 chip with a hairline (the open one with the tint's line). The open one has
 * `aria-current="page"` (the router's link sets it); `asChild` renders that link.
 */
export function SettingsNavItem({
  asChild,
  icon,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; icon: ReactNode }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'flex flex-none items-center gap-2 rounded-pill border border-n-300 px-4 text-small font-medium whitespace-nowrap text-n-900 no-underline',
        'h-11 hover:bg-group hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
        'aria-[current=page]:border-a-line aria-[current=page]:bg-a-50 aria-[current=page]:font-semibold aria-[current=page]:text-a-600',
        'md:h-auto md:min-h-10 md:gap-3 md:rounded-s md:border-0 md:px-3 md:py-2.5 md:whitespace-normal',
        "[&_svg]:flex-none [&_svg:not([class*='size-'])]:size-5",
        className,
      )}
    >
      {icon}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
    </Comp>
  )
}

/** The open section (`.pane`): up to 720 wide, at least 520 before something beside it wraps under it. */
export function SettingsPane({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex max-w-text min-w-0 flex-[999_1_520px] flex-col', className)} />
}

/**
 * The section's header (`.phd`): its name (an h2, 22/28 600: the top bar's «Settings» is the page's h1) and one line
 * under it (14/20), with `action` on the right (a link to the public page) that wraps under them when narrow.
 * `titleRef` makes the name focusable from code (`tabIndex -1`), for the page to move focus there when the section
 * changes.
 */
export function SettingsPaneHeader({
  title,
  lead,
  action,
  titleRef,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title' | 'children'> & {
  title: ReactNode
  lead?: ReactNode
  action?: ReactNode
  titleRef?: Ref<HTMLHeadingElement>
}) {
  return (
    <div {...props} className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pb-6', className)}>
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <h2 ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="m-0 text-h3 text-n-900 focus:outline-none">
          {title}
        </h2>
        {lead ? <p className="m-0 text-small text-n-600">{lead}</p> : null}
      </div>
      {action}
    </div>
  )
}

/**
 * A group of settings in the section (`.ps`): a hairline on top, 24 above and below, 20 between its rows; its title an
 * h3 (17/24 600) with an optional caption (13/18) under it. Name it with `aria-labelledby` on the title's id, as
 * <SettingsSectionTitle> gives it.
 */
export function SettingsSection({ className, ...props }: ComponentProps<'section'>) {
  return <section {...props} className={cn('flex flex-col gap-5 border-t border-n-200 py-6', className)} />
}

/**
 * A group's title (`.pst`) and its caption (`.cap`). `captionId` lets the group's control point at the caption
 * (`aria-describedby`, the booking rules' «Who answers requests?» radio cards).
 */
export function SettingsSectionTitle({
  caption,
  captionId,
  className,
  children,
  ...props
}: ComponentProps<'h3'> & { caption?: ReactNode; captionId?: string }) {
  const title = (
    <h3 {...props} className={cn('m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900', !caption && className)}>
      {children}
    </h3>
  )
  if (!caption) return title
  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {title}
      <p id={captionId} className="m-0 text-dense text-n-600">
        {caption}
      </p>
    </div>
  )
}
