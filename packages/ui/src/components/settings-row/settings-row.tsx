import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FieldScope } from '../field'

type Ids = { id: string; labelId: string; descriptionId?: string }

/**
 * One setting (DS-Patterns `.y-sr`; B-Settings, B-Onboarding `.srow`): the label 15/22 500 with its help 13/18 on the
 * left (at least 280), the control on the right; they wrap onto two lines when the row is narrow. A Switch or a Select
 * sits in the row at its own width; `wide` gives an input with its message the 320 column (`.y-scw`).
 * `layout="stacked"` puts the control under the label at full width (radio cards, «Who answers requests?»).
 *
 * The row wires its control as <Field> does: an Input or Select inside takes the row's id, help and `invalid` by
 * itself; anything else (a Switch, a radio group) gets the ids from `children` as a function.
 */
export function SettingsRow({
  label,
  description,
  id,
  invalid,
  layout = 'inline',
  wide,
  className,
  children,
  ...props
}: Omit<ComponentProps<'div'>, 'children' | 'id'> & {
  label: ReactNode
  description?: ReactNode
  /** The control's id; one is made when it's left out. */
  id?: string
  invalid?: boolean
  layout?: 'inline' | 'stacked'
  /** The 320 column for an input with its message under it (inline rows). */
  wide?: boolean
  children: ReactNode | ((ids: Ids) => ReactNode)
}) {
  const auto = useId()
  const controlId = id ?? auto
  const ids: Ids = { id: controlId, labelId: `${controlId}-label`, descriptionId: description ? `${controlId}-help` : undefined }
  const stacked = layout === 'stacked'
  return (
    <FieldScope value={{ id: controlId, labelId: ids.labelId, describedBy: ids.descriptionId, invalid: !!invalid }}>
      <div
        {...props}
        className={cn(stacked ? 'flex flex-col gap-3' : 'flex flex-wrap items-center justify-between gap-x-6 gap-y-3', className)}
      >
        <div className={cn('flex min-w-0 flex-col gap-0.5', !stacked && 'flex-[1_1_280px]')}>
          <label id={ids.labelId} htmlFor={controlId} className="text-body font-medium text-n-900">
            {label}
          </label>
          {description && (
            <span id={ids.descriptionId} className="text-dense text-n-600">
              {description}
            </span>
          )}
        </div>
        <div className={cn('flex min-w-0 flex-col gap-1.5', !stacked && (wide ? 'flex-[0_1_320px]' : 'items-end'))}>
          {typeof children === 'function' ? children(ids) : children}
        </div>
      </div>
    </FieldScope>
  )
}
