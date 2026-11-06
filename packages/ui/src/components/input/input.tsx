import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { useField } from '../field'

/** Shared look of text controls (DS `.inp`): 48 high, radius 8, n-300 border, a-500 + tint halo on focus. */
export const inputClass = cn(
  'w-full min-w-0 rounded-ctl-s border border-n-300 bg-n-0 px-3.5 text-body text-n-900 outline-none',
  'placeholder:text-n-500 hover:border-n-400',
  'focus:border-a-500 focus:shadow-input-focus focus-visible:shadow-input-focus',
  'aria-invalid:border-error aria-invalid:shadow-input-error',
  // a warning in the field (a duplicate phone): amber line and halo
  'data-[status=warning]:border-st-pending-dot data-[status=warning]:shadow-input-warning',
  'disabled:cursor-not-allowed disabled:border-n-200 disabled:bg-n-50 disabled:text-n-500',
)

type ControlProps = { invalid?: boolean }

export type InputSize = 's' | 'm' | 'l'

/** A3 Sizes (DS-Controls `.fld`): S 32 / r 8 / 13 · M 40 / r 10 / 14 · L 48 / r 12 / 16; L is the default. */
export const inputSize: Record<InputSize, string> = {
  s: 'h-8 rounded-ctl-s px-3 text-ctl-s',
  m: 'h-10 rounded-ctl-m px-3 text-ctl-m',
  l: 'h-12 rounded-ctl-l px-3.5 text-ctl-l',
}

function useControlProps(props: { id?: string; disabled?: boolean; invalid?: boolean; 'aria-describedby'?: string }) {
  const field = useField()
  return {
    id: props.id ?? field?.id,
    disabled: props.disabled ?? field?.disabled,
    'aria-invalid': (props.invalid ?? field?.invalid) ? true : undefined,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
    'data-status': field?.status === 'warning' ? ('warning' as const) : undefined,
  }
}

export function Input({
  className,
  invalid,
  size = 'l',
  ...props
}: Omit<ComponentProps<'input'>, 'size'> & ControlProps & { size?: InputSize }) {
  return <input {...props} {...useControlProps({ ...props, invalid })} className={cn(inputClass, inputSize[size], className)} />
}

export function Textarea({ className, invalid, ...props }: ComponentProps<'textarea'> & ControlProps) {
  return <textarea {...props} {...useControlProps({ ...props, invalid })} className={cn(inputClass, 'h-22 resize-none py-3', className)} />
}

export { useControlProps }
