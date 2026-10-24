import { Select } from '@yeral/ui/select'
import type { ComponentProps } from 'react'
import { choicesWith } from '@/shared/lib'
import { useRuleLabels } from '../lib/labels'
import { BUFFER_CHOICES, CANCEL_CHOICES, HOLD_CHOICES } from '../model/rules'

type SelectProps<T> = Omit<ComponentProps<typeof Select>, 'value' | 'onChange' | 'children'> & {
  value: T
  onValueChange: (value: T) => void
}

/** A select's value for «Any time», a `null` cancel window. */
const ANY = 'any'

/** «Hold requests for» (manual mode): 15 min … 24 h, a stored value the list lacks kept. */
export function HoldSelect({ value, onValueChange, ...props }: SelectProps<number>) {
  const label = useRuleLabels()
  return (
    <Select {...props} value={value} onChange={(e) => onValueChange(Number(e.target.value))}>
      {choicesWith(HOLD_CHOICES, value).map((m) => (
        <option key={m} value={m}>
          {label.hold(m)}
        </option>
      ))}
    </Select>
  )
}

/** «Clients can cancel for free»: Any time, or up to 1 … 48 h before. */
export function CancelSelect({ value, onValueChange, ...props }: SelectProps<number | null>) {
  const label = useRuleLabels()
  return (
    <Select {...props} value={value ?? ANY} onChange={(e) => onValueChange(e.target.value === ANY ? null : Number(e.target.value))}>
      {choicesWith(CANCEL_CHOICES, value).map((m) => (
        <option key={m ?? ANY} value={m ?? ANY}>
          {label.cancel(m)}
        </option>
      ))}
    </Select>
  )
}

/** The buffer's presets, None … 30 min, a value Settings typed in «Other…» kept as one more choice (the wizard's). */
export function BufferSelect({ value, onValueChange, ...props }: SelectProps<number>) {
  const label = useRuleLabels()
  return (
    <Select {...props} value={value} onChange={(e) => onValueChange(Number(e.target.value))}>
      {choicesWith(BUFFER_CHOICES, value).map((m) => (
        <option key={m} value={m}>
          {label.buffer(m)}
        </option>
      ))}
    </Select>
  )
}
