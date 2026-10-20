/**
 * Setting a business up (book B-02–B-06, Q-200): the wizard's steps after the phone, and the page address a name
 * gives. The business exists as a draft from the business step on; the wizard reopens at its saved step at sign-in,
 * and the draft joins the workspace switcher once the owner finishes.
 */

/** `/setup/{step}`: the name and category, the address, hours, services, team, how bookings arrive, the result. */
export const SETUP_STEPS = ['business', 'address', 'hours', 'services', 'team', 'rules', 'done'] as const
export type SetupStep = (typeof SETUP_STEPS)[number]

/** What finishing needs: an address, an open day, a service (B-03, B-04). */
export const SETUP_NEEDS = ['address', 'hours', 'services'] as const
export type SetupNeed = (typeof SETUP_NEEDS)[number]

/** The page address's longest name part; a number after it keeps addresses apart ("glow-studio-2"). */
export const SLUG_MAX = 48

const LETTERS: Record<string, string> = {
  // Turkmen letters a page address writes in plain Latin
  ä: 'a',
  ç: 'c',
  ň: 'n',
  ö: 'o',
  ş: 's',
  ü: 'u',
  ý: 'y',
  ž: 'z',
  // Russian, as a page address spells it
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/**
 * The page address a business name gives ("Glow Studio" → `glow-studio`, "Aýna Beauty" → `ayna-beauty`, "Салон Лилия" →
 * `salon-liliya`): Latin letters, digits and single dashes; `business` when nothing is left.
 */
export function slugFrom(name: string): string {
  const latin = [...name.toLowerCase()].map((ch) => LETTERS[ch] ?? ch).join('')
  // the marks letters lose (é → e), and what decomposes into capitals (№ → No)
  const plain = latin
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const slug = plain
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
  return slug || 'business'
}
