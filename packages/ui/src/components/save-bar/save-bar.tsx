import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

export type SaveBarProps = Omit<ComponentProps<'div'>, 'children'> & {
  /** «Save your changes?» */
  message: ReactNode
  /** The region's name for screen readers: «Unsaved changes». */
  label: string
  /** «Discard» */
  discardLabel: string
  /** «Save» */
  saveLabel: string
  /** Read out while saving: «Saving». */
  savingLabel: string
  onDiscard: () => void
  /** Save; or give `form` and Save submits that form. */
  onSave?: () => void
  /** The id of the form Save submits. */
  form?: string
  /** A field on the page is invalid: Save is disabled. */
  invalid?: boolean
  /** The save is on its way: a spinner in Save (same width), Discard waits. */
  saving?: boolean
}

/**
 * SaveBar (DS-Patterns → Overlays «Save bar · unsaved changes»; Account-Profile `.sbar`, B-Settings): the bar that asks
 * to save a form's changes. The screen shows it only while the form is dirty, and after a save a toast says so. Sticky
 * 16 from the bottom, max 720, raised, r16, 12 12 12 20; ghost Discard + primary Save (M); on phones the buttons share
 * the width. Every word comes from props.
 */
export function SaveBar({
  message,
  label,
  discardLabel,
  saveLabel,
  savingLabel,
  onDiscard,
  onSave,
  form,
  invalid = false,
  saving = false,
  className,
  ...props
}: SaveBarProps) {
  return (
    <div
      role="region"
      aria-label={label}
      {...props}
      className={cn(
        'sticky bottom-4 z-10 flex w-full max-w-text flex-wrap items-center justify-between gap-4 rounded-card border border-n-200 bg-n-0 py-3 pr-3 pl-5 shadow-raised',
        'max-sm:bottom-3 max-sm:p-3',
        className,
      )}
    >
      <span className="text-body font-semibold text-n-900">{message}</span>
      <div className="flex flex-wrap gap-2 max-sm:flex-1 max-sm:[&>*]:flex-1">
        <Button type="button" variant="ghost" disabled={saving} onClick={onDiscard} className="disabled:bg-transparent">
          {discardLabel}
        </Button>
        <Button
          type={form ? 'submit' : 'button'}
          form={form}
          variant="primary"
          disabled={invalid}
          loading={saving}
          loadingLabel={savingLabel}
          onClick={form ? undefined : onSave}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  )
}
