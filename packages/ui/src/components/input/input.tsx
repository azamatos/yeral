import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { useField } from '../field'

/** Shared look of text controls (DS `.inp`): 48 high, radius 8, n-300 border, a-500 + tint halo on focus. */
export const inputClass = cn(
  'w-full min-w-0 rounded-input border border-n-300 bg-n-0 px-3.5 text-body text-n-900 outline-none',
  'placeholder:text-n-500 hover:border-n-400',
  'focus:border-a-500 focus:shadow-input-focus focus-visible:shadow-input-focus',
  'aria-invalid:border-error aria-invalid:shadow-input-error',
  'disabled:cursor-not-allowed disabled:border-n-200 disabled:bg-n-50 disabled:text-n-500',
)

type ControlProps = { invalid?: boolean }

function useControlProps(props: { id?: string; disabled?: boolean; invalid?: boolean; 'aria-describedby'?: string }) {
  const field = useField()
  return {
    id: props.id ?? field?.id,
    disabled: props.disabled ?? field?.disabled,
    'aria-invalid': (props.invalid ?? field?.invalid) ? true : undefined,
    'aria-describedby': props['aria-describedby'] ?? field?.describedBy,
  }
}

export function Input({ className, invalid, ...props }: ComponentProps<'input'> & ControlProps) {
  return <input {...props} {...useControlProps({ ...props, invalid })} className={cn(inputClass, 'h-12', className)} />
}

export function Textarea({ className, invalid, ...props }: ComponentProps<'textarea'> & ControlProps) {
  return <textarea {...props} {...useControlProps({ ...props, invalid })} className={cn(inputClass, 'h-22 resize-none py-3', className)} />
}

export { useControlProps }
