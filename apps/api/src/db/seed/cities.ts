/**
 * Each market's cities (book Q-107), seeded like the categories: the list until the CMS manages cities, in production
 * too. The market's main city (`MARKET.mainCity`) is one of them. Centres are the city centres; English, Turkmen and
 * Russian names are drafts for the native review.
 */
import type { Localized } from '@yeral/domain/model'

export interface CitySeed {
  id: string
  name: Localized
  lat: number
  lng: number
}

const L = (tk: string, ru: string, en: string): Localized => ({ tk, ru, en })

export const CITIES: Record<string, CitySeed[]> = {
  // the capital, then the region centres west to east
  tm: [
    { id: 'ashgabat', name: L('Aşgabat', 'Ашхабад', 'Ashgabat'), lat: 37.9601, lng: 58.3261 },
    { id: 'turkmenbashi', name: L('Türkmenbaşy', 'Туркменбаши', 'Turkmenbashi'), lat: 40.0222, lng: 52.9552 },
    { id: 'balkanabat', name: L('Balkanabat', 'Балканабат', 'Balkanabat'), lat: 39.5108, lng: 54.3671 },
    { id: 'dashoguz', name: L('Daşoguz', 'Дашогуз', 'Dashoguz'), lat: 41.8363, lng: 59.9666 },
    { id: 'mary', name: L('Mary', 'Мары', 'Mary'), lat: 37.6005, lng: 61.8302 },
    { id: 'turkmenabat', name: L('Türkmenabat', 'Туркменабат', 'Turkmenabat'), lat: 39.0733, lng: 63.5786 },
  ],
}
