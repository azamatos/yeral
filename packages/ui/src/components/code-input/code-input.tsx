import { cva } from 'class-variance-authority'
import { useRef, useState, type ComponentProps, type Ref } from 'react'
import { cn } from '../../lib/cn'
import { useControlProps } from '../input'

export type CodeInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'maxLength' | 'size'> & {
  value: string
  onValueChange: (code: string) => void
  /** Called once all digits are in (the sign-in step checks the code on the 4th digit). */
  onComplete?: (code: string) => void
  length?: number
  invalid?: boolean
  /** Box size: 56 business login, 48 client modal and booking step, 52 on phones. */
  size?: 48 | 52 | 56
  /** Boxes turn 52 under 768 whatever `size` says (the sign-in step on phones). */
  responsive?: boolean
}

const row = cva('relative inline-flex self-start', {
  variants: {
    size: { 48: 'gap-2.5', 52: 'gap-3', 56: 'gap-3' },
    responsive: { true: 'max-sm:gap-3' },
  },
})

const box = cva('inline-flex items-center justify-center rounded-input border border-n-300 bg-n-0 font-semibold text-n-900 tabular-nums', {
  variants: {
    size: { 48: 'size-12 text-[20px]', 52: 'size-13 text-[22px]', 56: 'size-14 text-[24px]' },
    responsive: { true: 'max-sm:size-13 max-sm:text-[22px]' },
    state: {
      idle: '',
      focus: 'border-a-500 shadow-input-focus',
      error: 'border-error shadow-input-error',
      // checking: read-only boxes on n-50, the digits stay ink
      checking: 'border-n-200 bg-n-50',
      disabled: 'border-n-200 bg-n-50 text-n-500',
    },
  },
})

/**
 * Code boxes (DS-Patterns → 05 Inputs, the bare primitive of SignInCodeStep): one real input under the drawn boxes, so
 * paste, `autocomplete="one-time-code"`, the numeric keyboard and screen readers get one field named by its label;
 * the boxes only draw the digits, the caret and the state. Timers, tries, lock and messages belong to SignInCodeStep.
 */
export function CodeInput({
  value,
  onValueChange,
  onComplete,
  length = 4,
  invalid,
  disabled,
  readOnly,
  size = 56,
  responsive = false,
  className,
  ref,
  ...props
}: CodeInputProps) {
  const control = useControlProps({ ...props, disabled, invalid })
  const [focused, setFocused] = useState(false)
  const inner = useRef<HTMLInputElement | null>(null)
  const digits = value.slice(0, length).split('')
  const active = Math.min(digits.length, length - 1)
  const setRef = (el: HTMLInputElement | null) => {
    inner.current = el
    assignRef(ref, el)
  }

  return (
    <div className={cn(row({ size, responsive }), className)} onClick={() => inner.current?.focus()}>
      {Array.from({ length }, (_, i) => {
        const isActive = focused && !readOnly && i === active
        const state = control.disabled
          ? 'disabled'
          : control['aria-invalid']
            ? 'error'
            : readOnly
              ? 'checking'
              : isActive
                ? 'focus'
                : 'idle'
        return (
          <span key={i} aria-hidden className={cn(box({ size, responsive, state }))}>
            {digits[i] ??
              (isActive && digits.length < length ? <span className="h-[1.1em] w-0.5 animate-pulse rounded-[1px] bg-n-900" /> : null)}
          </span>
        )
      })}
      <input
        ref={setRef}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        {...props}
        {...control}
        readOnly={readOnly}
        value={value}
        onFocus={(e) => {
          setFocused(true)
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          props.onBlur?.(e)
        }}
        onChange={(e) => {
          // no maxLength: a pasted «48 21» or «Code: 4821» keeps all four digits
          const next = e.target.value.replace(/\D/g, '').slice(0, length)
          onValueChange(next)
          if (next.length === length) onComplete?.(next)
        }}
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
    </div>
  )
}

function assignRef<T>(ref: Ref<T> | undefined, value: T) {
  if (typeof ref === 'function') ref(value)
  else if (ref) ref.current = value
}
