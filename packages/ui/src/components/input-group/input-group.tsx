import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useField } from '../field'
import { inputClass, useControlProps } from '../input'

const heights = { l: 'h-12 text-body', m: 'h-11 text-small' }

export type InputGroupProps = Omit<ComponentProps<'input'>, 'size' | 'prefix'> & {
  /** A fixed n-50 box before the field (the phone's «+993»), 8 apart. */
  prefix?: ReactNode
  /**
   * A unit inside the field on the right («TMT», «min»): the figures align right beside it, and the field's name reads
   * it after its label («Price, TMT»).
   */
  suffix?: ReactNode
  /** 48 in forms, 44 in rows and settings. */
  size?: keyof typeof heights
  invalid?: boolean
}

/**
 * InputGroup (DS-Patterns → Inputs «Addons · prefix and suffix»; B-Onboarding services, B-Services, B-Settings): a
 * text field with a prefix box before it or a unit inside it. The unit is drawn once and read once: it's hidden from
 * screen readers and joined to the field's name instead, from the surrounding <Field>'s label or the field's own
 * `aria-label`.
 */
export function InputGroup({ prefix, suffix, size = 'l', invalid, className, ...props }: InputGroupProps) {
  const field = useField()
  const control = useControlProps({ ...props, invalid })
  const own = useId()
  const id = control.id ?? own
  const suffixId = `${id}-unit`
  // the field's name, then the unit: the Field's label, or the field itself when it carries its own aria-label
  const named = props['aria-labelledby'] ?? (props['aria-label'] ? id : field?.labelId)
  const input = (
    <input
      {...props}
      {...control}
      id={id}
      aria-labelledby={suffix && named ? `${named} ${suffixId}` : props['aria-labelledby']}
      className={cn(inputClass, heights[size], suffix && 'pr-14 text-right tabular-nums', 'max-sm:text-[16px]', !prefix && className)}
    />
  )
  const unit = suffix && (
    <span id={suffixId} aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-small text-n-600">
      {suffix}
    </span>
  )
  const box = suffix ? (
    <span className={cn('relative block min-w-0', prefix ? 'flex-1' : className)}>
      {input}
      {unit}
    </span>
  ) : (
    input
  )
  if (!prefix) return box
  return (
    <div className={cn('flex min-w-0 gap-2', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-flex flex-none items-center rounded-input border border-n-300 bg-n-50 px-3 font-medium text-n-900',
          heights[size],
        )}
      >
        {prefix}
      </span>
      {box}
    </div>
  )
}
