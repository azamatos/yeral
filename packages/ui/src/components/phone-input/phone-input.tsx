import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

export type PhoneInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type'> & {
  /** The national digits, without the country code. */
  value: string
  onValueChange: (digits: string) => void
  invalid?: boolean
  /** The market's country code, shown in its own box: «+993» (`COUNTRY_PREFIX` in @yeral/domain/phone). */
  prefix: string
  /** How many national digits a number has (`MARKET.phone.length`). */
  maxDigits: number
  /** Groups the digits as they're typed: «65 12 34 56» (`formatNational` in @yeral/domain/phone). */
  format: (digits: string) => string
}

/** Phone number: the country code in a fixed box + the national digits, grouped as you type (DS-Components → Inputs → Telefon). */
export function PhoneInput({ value, onValueChange, invalid, prefix, maxDigits, format, className, ...props }: PhoneInputProps) {
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
        value={format(value)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, maxDigits))}
        className={cn(inputClass, 'h-12 tabular-nums')}
      />
    </div>
  )
}
