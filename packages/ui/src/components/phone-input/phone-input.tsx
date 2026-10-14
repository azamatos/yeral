import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

/** «65 12 34 56» from up to 8 digits. */
export function formatLocalPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4, 6), d.slice(6, 8)].filter(Boolean).join(' ')
}

export type PhoneInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  /** The 8 local digits, without +993. */
  value: string
  onValueChange: (digits: string) => void
  invalid?: boolean
  /** Country prefix shown in its own box. */
  prefix?: string
}

/** Turkmen mobile number: fixed «+993» box + 8 digits, grouped as you type (DS-Components → Inputs → Telefon). */
export function PhoneInput({ value, onValueChange, invalid, prefix = '+993', className, ...props }: PhoneInputProps) {
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
        value={formatLocalPhone(value)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, 8))}
        className={cn(inputClass, 'h-12 tabular-nums')}
      />
    </div>
  )
}
