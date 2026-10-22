import { ChevronLeft } from 'lucide-react'
import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

export type WizardFooterProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** «Back»: a ghost L button with a chevron at the start. Leave it out on the first step. */
  back?: { label: ReactNode; onClick: () => void }
  /** Something else at the start instead of Back: «Cancel» when a signed-in owner creates another business. */
  start?: ReactNode
  /** Why the primary is disabled: «Pick a category.» Hidden on phones; the primary points at it. */
  hint?: ReactNode
  /** The primary L button's props: its label as `children`, `disabled` until the step is valid, `loading` while saving. */
  primary?: ComponentProps<typeof Button>
  /** More buttons before the primary («Send invites» on the last step). */
  children?: ReactNode
}

/**
 * WizardFooter (DS-Patterns → «Wizard footer · desktop sticky bottom»; B-Onboarding `.foot .fin .fh`): the setup
 * wizard's bar, sticky at the bottom, white with a top line. Back (ghost L) at the start, then the hint (13/18, n-600,
 * right-aligned, max 220) and the primary L at the end; the disabled primary is described by the hint. Inner width 736,
 * padding 16 48 → 14 32 under 1024 → 12 16 under 768, where the hint hides and the primary takes the free width; long
 * labels wrap the row. Back waits while the primary saves. Every word comes from props.
 */
export function WizardFooter({ back, start, hint, primary, children, className, ...props }: WizardFooterProps) {
  const hintId = useId()
  const { className: primaryClass, ...primaryProps } = primary ?? {}
  return (
    <div {...props} className={cn('sticky bottom-0 z-5 border-t border-n-200 bg-n-0', className)}>
      <div className="mx-auto flex max-w-184 flex-wrap items-center gap-3 px-12 py-4 max-md:px-8 max-md:py-3.5 max-sm:px-4 max-sm:py-3">
        {start}
        {back && (
          <Button
            type="button"
            variant="ghost"
            size="l"
            onClick={back.onClick}
            // leaving a step while it saves would land the save's answer on another step
            disabled={primary?.loading}
            className="-ml-3 min-w-0 pr-5 pl-3 disabled:bg-transparent"
          >
            <ChevronLeft aria-hidden strokeWidth={1.75} />
            {back.label}
          </Button>
        )}
        {/* on phones the primary takes the free width itself */}
        <div className="flex-1 max-sm:hidden" />
        {hint && (
          <span id={hintId} className="max-w-55 text-right text-dense text-n-600 max-sm:hidden">
            {hint}
          </span>
        )}
        {children}
        {primary && (
          <Button
            type="button"
            variant="primary"
            size="l"
            aria-describedby={hint ? hintId : undefined}
            {...primaryProps}
            className={cn('max-sm:flex-auto', primaryClass)}
          />
        )}
      </div>
    </div>
  )
}
