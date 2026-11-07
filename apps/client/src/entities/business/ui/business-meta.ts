import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { useTranslations } from 'use-intl'

/** «Barbershop · 1.2 km» (C7-Home `VenueResultRow`, A7: two short items, no street); the category alone without a position. */
export function useCardLine() {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  return (card: BusinessCard) =>
    card.distanceM === null ? card.category.name : t('line', { category: card.category.name, distance: fmt.distance(card.distanceM) })
}
