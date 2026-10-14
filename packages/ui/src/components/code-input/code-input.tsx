import { useRef, useState, type ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { useControlProps } from '../input'

export type CodeInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'maxLength'> & {
  value: string
  onValueChange: (code: string) => void
  /** Called once all digits are in (the login auto-submits on the 4th digit). */
  onComplete?: (code: string) => void
  length?: number
  invalid?: boolean
}

/**
 * SMS code boxes (Auth → «SMS kod»): one real input under the boxes, so paste, `autocomplete="one-time-code"` and
 * screen readers work; the boxes only draw the digits and the caret.
 */
export function CodeInput({ value, onValueChange, onComplete, length = 4, invalid, disabled, className, ...props }: CodeInputProps) {
  const control = useControlProps({ ...props, disabled, invalid })
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const digits = value.slice(0, length).split('')
  const active = Math.min(digits.length, length - 1)

  return (
    <div className={cn('relative inline-flex gap-3 self-start', className)} onClick={() => ref.current?.focus()}>
      {Array.from({ length }, (_, i) => {
        const isActive = focused && i === active
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              'inline-flex size-14 items-center justify-center rounded-input border border-n-300 bg-n-0 text-[24px] font-semibold text-n-900 tabular-nums',
              isActive && 'border-a-500 shadow-input-focus',
              control['aria-invalid'] && 'border-error shadow-input-error',
              control.disabled && 'border-n-200 bg-n-50 text-n-500',
            )}
          >
            {digits[i] ??
              (isActive && digits.length < length ? <span className="h-6.5 w-0.5 animate-pulse rounded-[1px] bg-n-900" /> : null)}
          </span>
        )
      })}
      <input
        ref={ref}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        {...props}
        {...control}
        value={value}
        maxLength={length}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, '').slice(0, length)
          onValueChange(next)
          if (next.length === length) onComplete?.(next)
        }}
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
    </div>
  )
}
