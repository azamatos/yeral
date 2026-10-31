import type { InternalStatus } from '@yeral/contract/settings'
import { cn } from '@yeral/ui/cn'
import { useTranslations } from 'use-intl'
import { INTERNAL_STATUS_ICON } from './status-icons'

/** The name an internal status shows: a preset worded in the reader's language («Arrived»), the business's own as written. */
export function useInternalStatusName() {
  const t = useTranslations('internalStatuses')
  return (status: Pick<InternalStatus, 'preset' | 'name'>) => (status.preset ? t(status.preset) : status.name)
}

/**
 * InternalStatusChip (DS-Business → InternalStatusChip, B-Calendar `.ca-ich`, book B-29): the team's marker on a
 * confirmed booking's block, an 18 px white circle with a faint ring and the status's icon, 12 px, in its colour;
 * `labelled` adds the name beside it (wide blocks). Decorative: the block's name says the status in words.
 */
export function InternalStatusChip({ status, labelled, className }: { status: InternalStatus; labelled?: boolean; className?: string }) {
  const Icon = INTERNAL_STATUS_ICON[status.icon]
  const name = useInternalStatusName()
  return (
    <span aria-hidden className={cn('inline-flex items-center gap-1', className)} style={{ color: status.color }}>
      <span className="inline-flex size-4.5 flex-none items-center justify-center rounded-full bg-n-0 shadow-[0_0_0_1px_rgba(16,16,20,0.1)]">
        <Icon strokeWidth={2.25} style={{ width: 12, height: 12 }} />
      </span>
      {labelled && <span className="text-[12px] leading-4 font-semibold">{name(status)}</span>}
    </span>
  )
}
