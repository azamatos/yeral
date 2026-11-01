import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import type { ClientBooking } from './card'

/** A booking in a line: «Hair colouring + Styling · Aýna». */
export function useWhat() {
  const t = useTranslations('clientCard')
  const join = useJoin()
  return (b: Pick<ClientBooking, 'items'>) => {
    const services = join(
      b.items.map((i) => i.service),
      'plus',
    )
    const staff = join([...new Set(b.items.flatMap((i) => i.staff ?? []))], 'list')
    return staff ? t('what', { services, staff }) : services
  }
}
