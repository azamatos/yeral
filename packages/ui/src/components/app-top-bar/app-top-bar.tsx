import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The page's top bar in the business app (DS-Patterns 06 · AppTopBar; B-Shell `.top`, B-Mobile `.mh`): the page's title
 * (`h1`) and its actions (one primary at most). 64 high from 1024 (title 22/28), 56 on a tablet (19/24) and a phone
 * (22/28). `leading` is the phone's alone: the workspace switcher strip on the calendar, which takes the title's place
 * there (the title stays for screen readers). No global search at the first release.
 */
export function AppTopBar({
  title,
  leading,
  actions,
  focusKey,
  className,
}: {
  title: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  /**
   * The page on screen (its address). When it changes, the title takes focus, so a screen reader starts at the new
   * page after a menu item or another workspace was picked, as the sign-in's steps do.
   */
  focusKey?: string
  className?: string
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusKey !== undefined) titleRef.current?.focus()
  }, [focusKey])
  return (
    <header
      className={cn(
        'flex h-14 flex-none items-center gap-0.5 border-b border-n-200 bg-n-0 pr-1 sm:gap-3 sm:px-5 md:h-16 md:gap-4 md:pr-6 md:pl-8',
        leading ? 'pl-1.5' : 'pl-4',
        className,
      )}
    >
      {leading && <div className="mr-auto flex min-w-0 sm:hidden">{leading}</div>}
      <h1
        ref={titleRef}
        tabIndex={focusKey !== undefined ? -1 : undefined}
        className={cn(
          'm-0 mr-auto min-w-0 truncate text-[22px] leading-7 font-bold tracking-[-0.015em] text-n-900 focus:outline-none sm:text-[19px] sm:leading-6 md:text-[22px] md:leading-7',
          leading && 'max-sm:sr-only',
        )}
      >
        {title}
      </h1>
      {actions && <div className="flex flex-none items-center gap-0.5 sm:gap-2">{actions}</div>}
    </header>
  )
}
