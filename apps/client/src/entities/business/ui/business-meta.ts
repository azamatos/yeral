import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { useTranslations } from 'use-intl'

/** «Barbershop · Magtymguly şaýoly 12 · 1.2 km»; the distance only when the search has a position. */
export function useCardLine() {
  const t = useTranslations('businessCard')
  const fmt = useFmt()
  return (card: BusinessCard) => {
    const line = t('line', { category: card.category.name, street: card.street })
    return card.distanceM === null ? line : t('lineFar', { line, distance: fmt.distance(card.distanceM) })
  }
}
