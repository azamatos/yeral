import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type FieldStatus = 'error' | 'warning' | 'success'

type FieldState = {
  id: string
  /** The label's id, for controls a `<label for>` can't name (a read-only `role="textbox"`). */
  labelId: string
  describedBy?: string
  invalid: boolean
  status?: FieldStatus
  disabled?: boolean
}
const FieldContext = createContext<FieldState | null>(null)

/** Lets a control inside <Field> pick up its id, description and error state. */
export function useField(): FieldState | null {
  return useContext(FieldContext)
}

const messageIcon = { error: CircleAlert, warning: TriangleAlert, success: CircleCheck }
const messageTone = {
  error: 'text-danger-ink',
  warning: 'font-semibold text-st-pending-ink',
  success: 'font-semibold text-st-completed-ink',
}

/**
 * A field message (DS-Patterns → 02 Feedback → «Field messages»): 13/18 with a 14 px icon, top-aligned when the text
 * wraps. Errors are `role="alert"`; warnings and successes `role="status"`. Use it on its own for a message that
 * belongs to a form step rather than one field (the sign-in step's «Too many codes» in place of its button).
 */
export function FieldMessage({ status = 'error', className, children, ...props }: ComponentProps<'span'> & { status?: FieldStatus }) {
  const Icon = messageIcon[status]
  return (
    <span
      role={status === 'error' ? 'alert' : 'status'}
      {...props}
      // a link in a message («Open client card») is a-600 and underlined, so it isn't told apart by colour alone
      className={cn(
        'flex items-start gap-1.5 text-dense [&_a]:font-semibold [&_a]:text-a-600 [&_a]:underline',
        messageTone[status],
        className,
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-3.5 flex-none" />
      <span className="min-w-0">{children}</span>
    </span>
  )
}

export type FieldProps = {
  label: ReactNode
  /** Help under the control (13/18, n-600). Stays under a message, so both describe the control. */
  hint?: ReactNode
  /** Error message under the control; also marks the control invalid. Shorthand for `status="error"` + `message`. */
  error?: ReactNode
  /** The message's kind: `error` (default; the control turns invalid), `warning` (the control's line turns amber), `success`. */
  status?: FieldStatus
  /** A message with an icon under the control, in the colour of `status`. */
  message?: ReactNode
  disabled?: boolean
  className?: string
  /** Use your own id when the control needs a known one. */
  id?: string
  children: ReactNode
}

/** Label above, always visible; a message (error, warning, success) and a hint below (DS-Components → Inputs). */
export function Field({ label, hint, error, status, message, disabled, className, id, children }: FieldProps) {
  const auto = useId()
  const controlId = id ?? auto
  const labelId = `${controlId}-label`
  const messageId = `${controlId}-message`
  const hintId = `${controlId}-hint`
  const note = error ?? message
  const tone: FieldStatus | undefined = error ? 'error' : message ? (status ?? 'error') : undefined
  const describedBy = [note ? messageId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined
  return (
    <FieldContext.Provider value={{ id: controlId, labelId, describedBy, invalid: tone === 'error', status: tone, disabled }}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label id={labelId} htmlFor={controlId} className="text-dense font-semibold text-n-900">
          {label}
        </label>
        {children}
        {note && tone && (
          <FieldMessage id={messageId} status={tone}>
            {note}
          </FieldMessage>
        )}
        {hint && (
          <span id={hintId} className="text-dense text-n-600">
            {hint}
          </span>
        )}
      </div>
    </FieldContext.Provider>
  )
}
