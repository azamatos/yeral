import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Clock, History, Wallet } from 'lucide-react'
import { useTranslations } from 'use-intl'

/**
 * The business's booking rules on the confirm step (Booking `.csec .rules`, book B-41): the free cancel or change
 * window, lateness and, when a booking is sent, «Pay at the place» (`pay`; a move changes nothing about the payment,
 * so its board leaves the line out), then the business's own note when it has one.
 */
export function Rules({ rules, pay = true, className }: { rules: BusinessDetail['rules']; pay?: boolean; className?: string }) {
  const t = useTranslations('booking.confirm')
  const fmt = useFmt()
  return (
    <section className={cn('flex flex-col gap-4 border-t border-n-200 py-7', className)}>
      <h2 className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em]">{t('rules')}</h2>
      <ul className="m-0 flex list-none flex-col gap-3.5 p-0 text-body [&_svg]:mt-px [&_svg]:size-5 [&_svg]:flex-none [&_svg]:text-n-600">
        <li className="flex items-start gap-3">
          <History aria-hidden strokeWidth={1.75} />
          {rules.cancelWindowMinutes ? t('cancelUpTo', { time: fmt.duration(rules.cancelWindowMinutes) }) : t('cancelAnyTime')}
        </li>
        <li className="flex items-start gap-3">
          <Clock aria-hidden strokeWidth={1.75} />
          {t('late', { minutes: rules.lateToleranceMinutes })}
        </li>
        {pay && (
          <li className="flex items-start gap-3">
            <Wallet aria-hidden strokeWidth={1.75} />
            {t('pay')}
          </li>
        )}
      </ul>
      {rules.note && <p className="m-0 rounded-m bg-group px-3.5 py-3 text-small text-n-600">{rules.note}</p>}
    </section>
  )
}
