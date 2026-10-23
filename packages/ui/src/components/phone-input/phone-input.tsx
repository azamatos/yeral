import { Lock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { useField } from '../field'
import { inputClass, useControlProps } from '../input'
import { addonClass } from '../input-group'

type Common = {
  /** The market's country code, shown in its own box: «+993» (`COUNTRY_PREFIX` in @yeral/domain/phone). */
  prefix: string
  /** 48 (default: login, booking, forms) or 44 (dense business panels: new booking, team, settings). */
  size?: 48 | 44
  className?: string
}

type EditableProps = Common &
  Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'type' | 'size' | 'prefix'> & {
    /** The national digits, without the country code. */
    value: string
    onValueChange: (digits: string) => void
    invalid?: boolean
    /** How many national digits a number has (`MARKET.phone.length`). */
    maxDigits: number
    /** Groups the digits as they're typed: «65 12 34 56» (`formatNational` in @yeral/domain/phone). */
    format: (digits: string) => string
    masked?: undefined
  }

type MaskedProps = Common & {
  /**
   * The SMS link page: the number on the booking, masked on the server — the national part, «65 •• •• 22»
   * (`maskPhone` in @yeral/domain/phone without the country code). Shown read-only with a lock; the full number never
   * reaches a signed-out page.
   */
  masked: string
  id?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

export type PhoneInputProps = EditableProps | MaskedProps

const prefixBox = addonClass
const heights = { 48: 'h-12 text-body', 44: 'h-11 text-small' }

/**
 * Phone number (DS-Patterns → 05 Inputs, the sign-in phone step): the country code in a fixed n-50 box + the
 * national digits, grouped as you type. Messages (incomplete, mobile only, duplicate warning, new-client success) and
 * the hint come from the surrounding <Field>. `masked` shows a known number read-only.
 */
export function PhoneInput(props: PhoneInputProps) {
  return props.masked !== undefined ? <MaskedPhone {...props} /> : <EditablePhone {...props} />
}

function EditablePhone({ value, onValueChange, invalid, prefix, maxDigits, format, size = 48, className, ...rest }: EditableProps) {
  const control = useControlProps({ ...rest, invalid })
  return (
    <div className={cn('flex gap-2', className)}>
      <span aria-hidden className={cn(prefixBox, heights[size])}>
        {prefix}
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        {...rest}
        {...control}
        value={format(value)}
        onChange={(e) => onValueChange(e.target.value.replace(/\D/g, '').slice(0, maxDigits))}
        // 16 px on phones so iOS doesn't zoom into the field
        className={cn(inputClass, heights[size], 'tabular-nums max-sm:text-[16px]')}
      />
    </div>
  )
}

function MaskedPhone({ masked, prefix, size = 48, className, id, ...aria }: MaskedProps) {
  const field = useField()
  return (
    <div className={cn('flex gap-2', className)}>
      <span aria-hidden className={cn(prefixBox, heights[size])}>
        {prefix}
      </span>
      <span
        id={id ?? field?.id}
        role="textbox"
        aria-readonly="true"
        // reachable with Tab like a read-only input, so the number is heard before Send code
        tabIndex={0}
        aria-labelledby={aria['aria-label'] ? undefined : field?.labelId}
        aria-label={aria['aria-label']}
        aria-describedby={aria['aria-describedby'] ?? field?.describedBy}
        className={cn(
          'flex min-w-0 flex-1 items-center gap-2 rounded-input border border-n-200 bg-n-50 px-3.5 font-medium tracking-[0.02em] text-n-900 tabular-nums',
          heights[size],
        )}
      >
        <Lock aria-hidden className="size-4 flex-none text-n-500" />
        {masked}
      </span>
    </div>
  )
}
