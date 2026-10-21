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
  // other letters that don't come apart into a plain one
  ı: 'i',
  ß: 'ss',
  ø: 'o',
  æ: 'ae',
  œ: 'oe',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
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
  // the Cyrillic letters of neighbouring languages
  ә: 'a',
  ғ: 'g',
  қ: 'k',
  ң: 'n',
  ө: 'o',
  ұ: 'u',
  ү: 'u',
  һ: 'h',
  і: 'i',
  ў: 'u',
  ҳ: 'h',
}

/** A page address part cut to `max` characters, at a dash past half of it when there is one. */
export function cutAtWord(slug: string, max: number): string {
  if (slug.length <= max) return slug
  const cut = slug.slice(0, max)
  const dash = cut.lastIndexOf('-')
  return (dash > max / 2 ? cut.slice(0, dash) : cut).replace(/-+$/, '')
}

/**
 * The page address a business name gives ("Glow Studio" → `glow-studio`, "Aýna Beauty" → `ayna-beauty`, "Салон Лилия" →
 * `salon-liliya`): Latin letters, digits and single dashes, cut at a word; `business` when nothing is left. Never
 * starting "yr-": `/b/` also opens booking codes (`YR-48213`, book chapter 5), so "YR Beauty" is `yrbeauty`.
 */
export function slugFrom(name: string): string {
  const latin = [...name.toLowerCase()].map((ch) => LETTERS[ch] ?? ch).join('')
  // the marks letters lose (é → e), and what decomposes into capitals (№ → No)
  const plain = latin
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  const slug = cutAtWord(plain.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''), SLUG_MAX).replace(/^yr-/, 'yr')
  return slug || 'business'
}
