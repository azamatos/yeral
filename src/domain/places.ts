import type { District } from './types'

/** Ashgabat districts used for search and landing pages (reference data, also served by the API). */
export const DISTRICTS: District[] = [
  { id: 'center', name: 'Центр' },
  { id: 'kopetdag', name: 'Копетдаг' },
  { id: 'bagtyyarlyk', name: 'Багтыярлык' },
  { id: 'berzengi', name: 'Берзенги' },
  { id: 'parahat', name: 'Парахат' },
  { id: 'mir', name: 'Мир' },
  { id: 'choganly', name: 'Чоганлы' },
  { id: 'archabil', name: 'Арчабиль' },
]

export const CITY_CENTER = { lat: 37.9445, lng: 58.375 }
