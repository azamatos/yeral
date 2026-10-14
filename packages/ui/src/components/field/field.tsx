import { createContext, useContext, useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

type FieldState = { id: string; describedBy?: string; invalid: boolean; disabled?: boolean }
const FieldContext = createContext<FieldState | null>(null)

/** Lets a control inside <Field> pick up its id, description and error state. */
export function useField(): FieldState | null {
  return useContext(FieldContext)
}

export type FieldProps = {
  label: ReactNode
  /** Help under the control (13/18, n-600). Replaced by `error` when there is one. */
  hint?: ReactNode
  /** Error message under the control (danger ink); also marks the control invalid. */
  error?: ReactNode
  disabled?: boolean
  className?: string
  /** Use your own id when the control needs a known one. */
  id?: string
  children: ReactNode
}

/** Label above, always visible; hint or error below (DS-Components → Inputs). */
export function Field({ label, hint, error, disabled, className, id, children }: FieldProps) {
  const auto = useId()
  const controlId = id ?? auto
  const noteId = `${controlId}-note`
  const note = error ?? hint
  return (
    <FieldContext.Provider value={{ id: controlId, describedBy: note ? noteId : undefined, invalid: Boolean(error), disabled }}>
      <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
        <label htmlFor={controlId} className="text-dense font-semibold text-n-900">
          {label}
        </label>
        {children}
        {note && (
          <span id={noteId} className={cn('text-dense', error ? 'text-danger-ink' : 'text-n-600')} role={error ? 'alert' : undefined}>
            {note}
          </span>
        )}
      </div>
    </FieldContext.Provider>
  )
}
