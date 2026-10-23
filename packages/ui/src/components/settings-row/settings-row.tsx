import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * One setting (DS-Patterns `.y-sr`; B-Settings, B-Onboarding `.srow`): the label 15/22 500 with its help 13/18 on the
 * left (at least 280), the control on the right (up to 320); they wrap onto two lines when the row is narrow. With
 * `htmlFor` the label is the control's `<label>`; a group of controls (radio cards) takes `labelId` as its
 * `aria-labelledby` instead. `descriptionId` names the help for the control's `aria-describedby`.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  labelId,
  descriptionId,
  className,
  children,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  label: ReactNode
  description?: ReactNode
  htmlFor?: string
  labelId?: string
  descriptionId?: string
  /** The control: a Switch, Select, NumberStepper, an Input in a Field, or radio cards. */
  children: ReactNode
}) {
  const labelClass = 'text-body font-medium text-n-900'
  return (
    <div {...props} className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3', className)}>
      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-0.5">
        {htmlFor ? (
          <label htmlFor={htmlFor} id={labelId} className={labelClass}>
            {label}
          </label>
        ) : (
          <span id={labelId} className={labelClass}>
            {label}
          </span>
        )}
        {description && (
          <span id={descriptionId} className="text-dense text-n-600">
            {description}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-[0_1_320px] flex-col gap-1.5">{children}</div>
    </div>
  )
}
