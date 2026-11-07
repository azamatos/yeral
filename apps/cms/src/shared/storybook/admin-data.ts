import type { AdminBusiness, AdminBusinessItem } from '@yeral/contract/admin'

/** A business as the admin api sends it, waiting in the queue. */
export const BUSINESS_ITEM: AdminBusinessItem = {
  id: '11111111-1111-4111-8111-111111111111',
  slug: 'glow-studio',
  name: 'Glow Studio',
  category: { id: 'beauty', name: 'Beauty' },
  city: { id: 'ashgabat', name: 'Ashgabat' },
  address: '12 Magtymguly Avenue',
  phone: '+99362000111',
  owner: { name: 'Aýna Berdiýewa', phone: '+99365000111' },
  verification: 'pending',
  reason: null,
  hidden: null,
  closed: null,
  recheck: null,
  addressChangedAt: null,
  pendingName: null,
  sentForReviewAt: Date.UTC(2026, 9, 30, 9, 15),
  setupStep: null,
  createdAt: Date.UTC(2026, 9, 28, 9, 15),
}

export const BUSINESS: AdminBusiness = {
  ...BUSINESS_ITEM,
  about: { en: 'Hair and nails in the city centre.' },
  location: { lat: 37.95, lng: 58.38 },
  floor: '2, room 14',
  entranceNote: null,
  hideExactAddress: false,
  logo: null,
  photos: [],
  services: 12,
  team: 3,
  history: [{ status: 'pending', reason: null, at: Date.UTC(2026, 9, 30, 9, 15) }],
  actions: [],
}
