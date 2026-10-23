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

/** Gives the controls inside the same wiring as <Field> does, for a label drawn another way (SettingsRow). */
export const FieldScope = FieldContext.Provider

const messageIcon = { error: CircleAlert, warning: TriangleAlert, success: CircleCheck }
const messageTone = {
  error: 'text-danger-ink',
  warning: 'font-semibold text-st-pending-ink',
  success: 'font-semibold text-st-completed-ink',
}

/**
 * A field message (DS-Patterns → 02 Feedback → «Field messages»): 13/18 with a 14 px icon, top-aligned when the text
 * wraps. Errors are `role="alert"`; warnings and successes `role="status"`; `live={false}` drops the role for a
 * message that ticks (a countdown) and is announced another way. Use it on its own for a message that belongs to a
 * form step rather than one field (the sign-in step's «Too many codes» in place of its button).
 */
export function FieldMessage({
  status = 'error',
  live = true,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { status?: FieldStatus; live?: boolean }) {
  const Icon = messageIcon[status]
  return (
    <span
      role={live ? (status === 'error' ? 'alert' : 'status') : undefined}
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
  /** `false` when the message ticks (a countdown) and is announced another way: no live role. */
  messageLive?: boolean
  disabled?: boolean
  className?: string
  /** Use your own id when the control needs a known one. */
  id?: string
  /** Words after the label in regular n-600: «(optional)». */
  optional?: ReactNode
  /**
   * A character counter right of the hint (B-Onboarding `.ccount`): `text` is «12 / 80» formatted by the screen,
   * `value` and `max` set its tone — n-600, warning ink from 90 % of `max`, danger ink 600 over `max`. It describes the
   * control too.
   */
  counter?: { value: number; max: number; text: ReactNode }
  children: ReactNode
}

/** Label above, always visible; a message (error, warning, success) and a hint below (DS-Components → Inputs). */
export function Field({
  label,
  hint,
  error,
  status,
  message,
  messageLive = true,
  disabled,
  className,
  id,
  optional,
  counter,
  children,
}: FieldProps) {
  const auto = useId()
  const controlId = id ?? auto
  const labelId = `${controlId}-label`
  const messageId = `${controlId}-message`
  const hintId = `${controlId}-hint`
  const counterId = `${controlId}-counter`
  // a falsy `error` (`error={failed && text}`) leaves room for the message
  const note = error ? error : message
  const tone: FieldStatus | undefined = error ? 'error' : message ? (status ?? 'error') : undefined
  const describedBy = [note ? messageId : null, hint ? hintId : null, counter ? counterId : null].filter(Boolean).join(' ') || undefined
  const hintEl = hint && (
    <span id={hintId} className="text-dense text-n-600">
      {hint}
    </span>
  )
  return (
    <FieldContext.Provider value={{ id: controlId, labelId, describedBy, invalid: tone === 'error', status: tone, disabled }}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label id={labelId} htmlFor={controlId} className="text-dense font-semibold text-n-900">
          {label}
          {optional && <span className="font-normal text-n-600"> {optional}</span>}
        </label>
        {children}
        {note && tone && (
          <FieldMessage id={messageId} status={tone} live={messageLive}>
            {note}
          </FieldMessage>
        )}
        {counter ? (
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            {hintEl}
            <span
              id={counterId}
              className={cn(
                'ml-auto text-dense whitespace-nowrap text-n-600 tabular-nums',
                counter.value > counter.max ? 'font-semibold text-danger-ink' : counter.value >= counter.max * 0.9 && 'text-st-pending-ink',
              )}
            >
              {counter.text}
            </span>
          </div>
        ) : (
          hintEl
        )}
      </div>
    </FieldContext.Provider>
  )
}
