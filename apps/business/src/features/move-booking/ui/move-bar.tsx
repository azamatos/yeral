import type { CalendarBooking } from '@yeral/contract/calendar'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Move } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'

/**
 * Move mode's bar over the grid (B-Calendar `.mvbar`): who's moving and what, and the way out. It stays while the
 * confirm is open, so the grid doesn't jump under the slot just picked.
 */
export function MoveBar({ booking: b, onBack }: { booking: CalendarBooking; onBack: () => void }) {
  const t = useTranslations('moveBooking')
  const fmt = useFmt()
  const join = useJoin()
  const services = join(
    b.items.map((i) => i.service),
    'plus',
  )
  return (
    <div
      role="status"
      className="mx-4 mt-3 flex flex-none items-center gap-3 rounded-m bg-n-900 py-1.5 pr-1.5 pl-4 text-small text-n-0 sm:mx-6 lg:mx-8"
    >
      <Move aria-hidden strokeWidth={1.75} className="size-4.5 flex-none" />
      <span className="min-w-0 flex-1">
        {t.rich('bar', {
          client: b.client.name ?? t('unnamed'),
          what: join([services, fmt.duration(b.end - b.start)], 'dot'),
          b: (chunks) => <b className="font-semibold">{chunks}</b>,
        })}
      </span>
      <Button variant="ghost" size="s" className="min-w-0 text-a-200 hover:bg-ink-btn-hover hover:text-a-200" onClick={onBack}>
        {t('back')}
      </Button>
    </div>
  )
}
