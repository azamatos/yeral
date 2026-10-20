import { useEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type AuthCardProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** The page header's content, 72 high under a hairline: the logo lockup (a language switcher joins with a market's second language). */
  header?: ReactNode
  /** Above the title, 24 apart: the workspace row (logo 56 + name), an icon tile 48, the workspace logo 64. */
  media?: ReactNode
  /** A label line over the title in caps («Invite», «Step 4 of 8 · Hours»). */
  eyebrow?: ReactNode
  /** The step's `h1` (26/32, 24/30 on phones). */
  title: ReactNode
  /** Under the title, 15/22 n-600; `<b>` in it reads n-900. */
  lead?: ReactNode
  /** Under the card: one centred link («Book on Ýeral as a client → yeral.app»). */
  footer?: ReactNode
  /** `id` of the `h1`, for a form or group inside to name itself by (`aria-labelledby`). */
  titleId?: string
  /**
   * The step on screen. When it changes, the title takes focus, so a screen reader starts at the new step. Set it on
   * steps without a field of their own (invite, no workspace, opening); leave it out where a field takes focus
   * (phone, code, name).
   */
  focusKey?: string
  /** `center` for a step that is only a message (opening the workspace). */
  align?: 'start' | 'center'
}

/**
 * AuthCard — the sign-in page's layout (B-Login, B-Mobile frame 1; DS-Patterns → «Sign-in»): a page header, a centred
 * card (max 440, pad 32, r16, n-200 line, 24 between its parts) with the step's title and lead, the step itself as
 * children, and a footer link. On phones the card loses its frame and padding. Layout only: the steps (SignInCodeStep,
 * the name, an invite, no workspace yet, opening the workspace) are the screen's, and so is every word.
 */
export function AuthCard({
  header,
  media,
  eyebrow,
  title,
  lead,
  footer,
  titleId,
  focusKey,
  align = 'start',
  children,
  className,
  ...props
}: AuthCardProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (focusKey !== undefined) titleRef.current?.focus()
  }, [focusKey])
  const center = align === 'center'

  return (
    <div {...props} className={cn('flex min-h-dvh flex-col bg-n-0 text-n-900', className)}>
      {header && (
        <header className="border-b border-n-200 bg-n-0">
          <div className="mx-auto flex h-18 w-full max-w-[1280px] items-center gap-4 px-10 max-sm:px-4">{header}</div>
        </header>
      )}
      <main className="flex flex-1 items-start justify-center px-4 pt-16 pb-14 max-sm:pt-6 max-sm:pb-10">
        <div
          className={cn(
            'flex w-full max-w-110 flex-col gap-6 rounded-card border border-n-200 bg-n-0 p-8',
            'max-sm:rounded-none max-sm:border-0 max-sm:p-0',
            center && 'items-center pt-12 pb-10 text-center max-sm:pt-4 max-sm:pb-2',
          )}
        >
          {media}
          <div className={cn('flex flex-col gap-2', center && 'items-center')}>
            {eyebrow && <span className="text-label text-n-500 uppercase">{eyebrow}</span>}
            <h1
              ref={titleRef}
              id={titleId}
              tabIndex={focusKey !== undefined ? -1 : undefined}
              className="m-0 text-[26px] leading-8 font-bold tracking-[-0.02em] text-balance focus:shadow-none focus:outline-none max-sm:text-[24px] max-sm:leading-[30px]"
            >
              {title}
            </h1>
            {lead && <div className="text-body text-n-600 [&_b]:font-semibold [&_b]:text-n-900">{lead}</div>}
          </div>
          {children}
        </div>
      </main>
      {footer && <footer className="flex justify-center px-4 pt-6 pb-10 text-small text-n-600 max-sm:pb-8">{footer}</footer>}
    </div>
  )
}
