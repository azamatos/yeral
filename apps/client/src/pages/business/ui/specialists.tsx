import { Link } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { Rating } from '@yeral/ui/rating'
import { useLocale, useTranslations } from 'use-intl'
import { nextFreeText } from '../model/when'
import type { BookingState } from './business-page'
import { Section } from './sections'

/**
 * Venue «Hünärmenler» (book C-06 step 4, COMPONENTS StaffCard): a card each (avatar 64, name, specialization, rating,
 * «Next free:» and «Book»), as many in a row as fit at 170. «Book» opens the booking with that person chosen, and the
 * services already picked on the page with them (at the specialist step, as the card's Continue does); on the owner's
 * preview it's there, disabled (Q-153); a paused or phone-only page shows neither the time nor the button.
 */
export function Specialists({ detail, state, picked }: { detail: BusinessDetail; state: BookingState; picked: readonly string[] }) {
  const t = useTranslations('business.team')
  const card = useTranslations('business.card')
  const fmt = useFmt()
  const lang = useLocale()
  const now = useClock()
  const bookable = state === 'online' || state === 'preview'
  const services = picked.length > 0 ? { services: picked.join(','), step: 'staff' as const } : {}
  return (
    <Section id="specialists" title={t('title')}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-4 p-0">
        {detail.specialists.map((s) => (
          <li key={s.id} className="flex flex-col items-center gap-3 rounded-card border border-n-200 px-4 pt-6 pb-5 text-center">
            <Avatar name={s.name} src={s.photo?.url} size={64} decorative />
            <span className="flex flex-col gap-0.5">
              <span className="text-[16px] leading-[22px] font-semibold text-n-900">{s.name}</span>
              {s.role && <span className="text-dense text-n-600">{s.role}</span>}
            </span>
            {s.rating !== null && <Rating value={fmt.rating(s.rating)} className="text-small [&_svg]:size-3.5" />}
            {bookable && (
              <span className="flex flex-col">
                <span className="text-dense text-n-600">{t('next')}</span>
                <span className="text-small font-semibold text-n-900">
                  {s.nextFree ? nextFreeText(s.nextFree, today(now), fmt, (values) => card('at', values)) : t('noneSoon')}
                </span>
              </span>
            )}
            {state === 'online' ? (
              <Button asChild size="s" variant="secondary" className="mt-1">
                <Link
                  to="/$lang/b/$slug/book"
                  params={{ lang, slug: detail.slug }}
                  search={{ ...services, staff: s.id }}
                  // the word seen stays in the name heard (axe: label-content-name-mismatch)
                  aria-label={t('bookLabel', { name: s.name })}
                >
                  {t('book')}
                </Link>
              </Button>
            ) : (
              state === 'preview' && (
                <Button size="s" variant="secondary" className="mt-1" disabled>
                  {t('book')}
                </Button>
              )
            )}
          </li>
        ))}
      </ul>
    </Section>
  )
}
