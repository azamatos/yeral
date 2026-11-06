import { Select, type SelectProps as UiSelectProps } from '@yeral/ui/select'
import { choicesWith } from '@/shared/lib'
import { useRuleLabels } from '../lib/labels'
import { BUFFER_CHOICES, CANCEL_CHOICES, HOLD_CHOICES } from '../model/rules'

type SelectProps<T> = Omit<UiSelectProps, 'value' | 'onValueChange' | 'options'> & {
  value: T
  onValueChange: (value: T) => void
}

/** A select's value for «Any time», a `null` cancel window. */
const ANY = 'any'

/** «Hold requests for» (manual mode): 15 min … 24 h, a stored value the list lacks kept. */
export function HoldSelect({ value, onValueChange, ...props }: SelectProps<number>) {
  const label = useRuleLabels()
  return (
    <Select
      {...props}
      value={String(value)}
      onValueChange={(v) => onValueChange(Number(v))}
      options={choicesWith(HOLD_CHOICES, value).map((m) => ({ value: String(m), label: label.hold(m) }))}
    />
  )
}

/** «Clients can cancel for free»: Any time, or up to 1 … 48 h before. */
export function CancelSelect({ value, onValueChange, ...props }: SelectProps<number | null>) {
  const label = useRuleLabels()
  return (
    <Select
      {...props}
      value={value === null ? ANY : String(value)}
      onValueChange={(v) => onValueChange(v === ANY ? null : Number(v))}
      options={choicesWith(CANCEL_CHOICES, value).map((m) => ({ value: m === null ? ANY : String(m), label: label.cancel(m) }))}
    />
  )
}

/** The buffer's presets, None … 30 min, a value Settings typed in «Other…» kept as one more choice (the wizard's). */
export function BufferSelect({ value, onValueChange, ...props }: SelectProps<number>) {
  const label = useRuleLabels()
  return (
    <Select
      {...props}
      value={String(value)}
      onValueChange={(v) => onValueChange(Number(v))}
      options={choicesWith(BUFFER_CHOICES, value).map((m) => ({ value: String(m), label: label.buffer(m) }))}
    />
  )
}
