import { Check } from 'lucide-react'
import { useTranslations } from 'use-intl'

/** "You declined Glow Studio's invite." on top of the card that comes after a decline (B-Login `declined`). */
export function DeclinedLine({ business }: { business: string }) {
  const t = useTranslations('login')
  return (
    <p role="status" className="m-0 flex items-center gap-2.5 self-stretch rounded-m border border-n-200 bg-n-50 px-4 py-3 text-small">
      <Check aria-hidden className="size-4.5 flex-none text-n-600" />
      {t('invite.declined', { business })}
    </p>
  )
}
