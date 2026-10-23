import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { inputClass, useControlProps } from '../input'

const heights = { l: 'h-12 text-body', m: 'h-11 text-small' }

/** The fixed box before a field (InputGroup's `prefix`, PhoneInput's «+993»): n-50 fill, n-300 line, 500 ink. */
export const addonClass = cn(
  'inline-flex flex-none items-center rounded-input border border-n-300 bg-n-50 px-3 font-medium text-n-900',
  'data-disabled:border-n-200 data-disabled:text-n-500 data-invalid:border-error',
)

export type InputGroupProps = Omit<ComponentProps<'input'>, 'size' | 'prefix'> & {
  /** A fixed n-50 box before the field (a country code), 8 apart. */
  prefix?: ReactNode
  /** A unit inside the field on the right («TMT», «min»): the figures align right beside it. */
  suffix?: string
  /** 48 in forms, 44 in rows and settings. */
  size?: keyof typeof heights
  invalid?: boolean
}

/**
 * InputGroup (DS-Patterns → Inputs «Addons · prefix and suffix»; B-Onboarding services, B-Services, B-Settings): a
 * text field with a prefix box before it or a unit inside it. The unit is drawn once and read once: hidden from screen
 * readers and given as the field's description («Price, TMT»), whatever names the field. `className` sizes the group.
 */
export function InputGroup({ prefix, suffix, size = 'l', invalid, className, ...props }: InputGroupProps) {
  const control = useControlProps({ ...props, invalid })
  const unitId = `${useId()}-unit`
  const describedBy = [control['aria-describedby'], suffix && unitId].filter(Boolean).join(' ') || undefined
  const state = { 'data-disabled': control.disabled ? '' : undefined, 'data-invalid': control['aria-invalid'] ? '' : undefined }
  return (
    <div className={cn('flex min-w-0 gap-2', className)}>
      {prefix && (
        <span aria-hidden {...state} className={cn(addonClass, heights[size])}>
          {prefix}
        </span>
      )}
      <span className="relative block min-w-0 flex-1">
        <input
          {...props}
          {...control}
          aria-describedby={describedBy}
          // the unit's room: its letters and the 12 px on each side of it
          style={suffix ? { paddingRight: `calc(${suffix.length}ch + 24px)`, ...props.style } : props.style}
          className={cn(inputClass, heights[size], suffix && 'text-right tabular-nums', 'max-sm:text-[16px]')}
        />
        {suffix && (
          <span
            id={unitId}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small whitespace-nowrap text-n-600"
          >
            {suffix}
          </span>
        )}
      </span>
    </div>
  )
}
