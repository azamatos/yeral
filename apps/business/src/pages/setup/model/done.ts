/**
 * The done step's rules (B-Onboarding `isDone`, book B-06): the quality checklist's states and the page's share links.
 */
import { SETUP_NEEDS, type SetupNeed } from '@yeral/domain/setup'

/** «Add 3+ photos» is done from this many (design §27.2: the first one is the card's picture). */
export const PHOTOS_GOOD = 3

export type QualityItem = 'logo' | 'photos' | 'about'
export const QUALITY_ITEMS: readonly QualityItem[] = ['logo', 'photos', 'about']
export type QualityStatus = 'done' | 'current' | 'todo'

/**
 * Each item done or not; the first one not done is the current one (the 2 px ring: what to do next), the rest wait.
 */
export function qualityOf(page: { logo: boolean; photos: number; about: boolean }): Record<QualityItem, QualityStatus> {
  const done: Record<QualityItem, boolean> = { logo: page.logo, photos: page.photos >= PHOTOS_GOOD, about: page.about }
  const next = QUALITY_ITEMS.find((item) => !done[item])
  return Object.fromEntries(QUALITY_ITEMS.map((item) => [item, done[item] ? 'done' : item === next ? 'current' : 'todo'])) as Record<
    QualityItem,
    QualityStatus
  >
}

/** Whether any language's «About» says something. */
export const hasAbout = (about: Partial<Record<string, string>>) => Object.values(about).some((text) => !!text?.trim())

/**
 * The page's share links (B-Settings Link and QR's Share menu: WhatsApp · Telegram; IMO has no share address, so it
 * waits for the phone's own share sheet).
 */
export function shareLinks(url: string) {
  const link = encodeURIComponent(url)
  return { whatsapp: `https://wa.me/?text=${link}`, telegram: `https://t.me/share/url?url=${link}` }
}

/** The step to fix first when finishing finds something missing (`setup_incomplete`), in the wizard's order. */
export function firstMissing(missing: readonly SetupNeed[]): SetupNeed | null {
  return SETUP_NEEDS.find((need) => missing.includes(need)) ?? null
}
