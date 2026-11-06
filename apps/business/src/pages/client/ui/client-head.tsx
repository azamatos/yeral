import type { ClientCard } from '@yeral/contract/clients'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Pill } from '@yeral/ui/pill'
import { toast } from '@yeral/ui/toast'
import { Copy, Phone } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { ClientTags } from '@/entities/client'

/**
 * The card's head (B-Client `.hdr`): the avatar, the full name, the number with Copy and Call, «Ýeral account» when an
 * account holds the number, the tags, since when and how they found you; Change for those who manage clients.
 */
export function ClientHead({ card, manage, onEdit }: { card: ClientCard; manage: boolean; onEdit: () => void }) {
  const t = useTranslations('clientCard')
  const clients = useTranslations('clients')
  const sources = useTranslations('clients.sources')
  const fmt = useFmt()
  const { phone } = card
  const copy = (number: string) => void navigator.clipboard.writeText(number).then(() => toast(clients('copied')))
  const since = t('since', { month: fmt.monthYear(card.since) })
  return (
    <div className="flex items-start gap-5 pb-7 max-sm:flex-wrap max-sm:gap-4">
      <Avatar name={card.name ?? ''} size={64} letters={1} tone="tint" decorative />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2">
        <h2 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] [overflow-wrap:anywhere] text-n-900">
          {card.name ?? clients('unnamed')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {phone ? (
            <>
              <span className="text-body text-n-900">{fmt.phone(phone)}</span>
              <Button variant="ghost" size="s" iconOnly aria-label={clients('copy')} onClick={() => copy(phone)}>
                <Copy aria-hidden />
              </Button>
              <Button asChild variant="secondary" size="s">
                <a href={`tel:${phone}`}>
                  <Phone aria-hidden />
                  {t('call')}
                </a>
              </Button>
            </>
          ) : (
            <span className="text-body text-n-600">{clients('noNumber')}</span>
          )}
          {card.account && (
            <Pill tone="neutral" size="m">
              {t('account')}
            </Pill>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ClientTags phoneOnly={card.settings.phoneOnly} segments={card.segments} tags={card.tags} size="m" />
          <span className="text-dense text-n-600">{card.source ? t('sinceSource', { since, source: sources(card.source) }) : since}</span>
        </div>
      </div>
      {manage && (
        <Button variant="ghost" size="s" onClick={onEdit}>
          {t('change')}
        </Button>
      )}
    </div>
  )
}
