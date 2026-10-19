import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

/** «65 12 34 56» from the national digits, cut into `groups` (Turkmenistan: [2, 2, 2, 2]). */
export function formatLocalPhone(digits: string, groups: readonly number[]): string {
  const d = digits.replace(/\D/g, '').slice(0, maxDigits(groups))
  const parts: string[] = []
  let at = 0
  for (const size of groups) {
    const part = d.slice(at, at + size)
    if (part) parts.push(part)
    at += size
  }
  return parts.join(' ')
}

const maxDigits = (groups: readonly number[]) => groups.reduce((a, b) => a + b, 0)

export type PhoneInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  /** The national digits, without the country code. */
  value: string
  onValueChange: (digits: string) => void
  invalid?: boolean
  /** The market's country code, shown in its own box: «+993». */
  prefix: string
  /** How the market groups the national digits as they're typed; their sum is the number's length. */
  groups: readonly number[]
}

/** Phone number: the country code in a fixed box + the national digits, grouped as you type (DS-Components → Inputs → Telefon). */
export function PhoneInput({ value, onValueChange, invalid, prefix, groups, className, ...props }: PhoneInputProps) {
  const control = useControlProps({ ...props, invalid })
  return (
    <div className={cn('flex gap-2', className)}>
      <span
        aria-hidden
        className="inline-flex h-12 flex-none items-center rounded-input border border-n-300 px-3 text-body font-medium text-n-900"
      >
        {prefix}
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        {...props}
        {...control}
        value={formatLocalPhone(value, groups)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, maxDigits(groups)))}
        className={cn(inputClass, 'h-12 tabular-nums')}
      />
    </div>
  )
}
