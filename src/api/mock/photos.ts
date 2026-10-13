import type { CategoryId } from '@/domain/types'

/**
 * Stock photos (public/photos — Unsplash/Pexels licence, sources in public/photos/manifest.json).
 * Every salon gets its own cover; the gallery mixes the rest of its categories with generic details.
 */
const N: Record<string, number> = { barber: 8, hair: 7, nails: 7, brows: 4, massage: 6, cosmo: 5, makeup: 3, detail: 5 }
const DIR: Record<CategoryId, string> = { barber: 'barber', hair: 'hair', nails: 'nails', brows: 'brows', massage: 'massage', cosmetology: 'cosmo', makeup: 'makeup' }
const p = (dir: string, i: number) => `/photos/${dir}-${String(i).padStart(2, '0')}.jpg`

const COVER: Record<string, string> = {
  s1: p('barber', 8), s2: p('barber', 1), s5: p('barber', 2), s6: p('barber', 4), s7: p('barber', 5), s24: p('barber', 3),
  s4: p('hair', 1), s8: p('hair', 3), s9: p('hair', 4), s10: p('hair', 2), s11: p('hair', 7), s23: p('hair', 6),
  s3: p('nails', 1), s12: p('nails', 3), s13: p('nails', 7), s14: p('nails', 2),
  s15: p('brows', 2), s16: p('brows', 1),
  s17: p('massage', 1), s18: p('massage', 5), s19: p('massage', 3),
  s20: p('cosmo', 1), s21: p('cosmo', 2),
  s22: p('makeup', 3),
}
const COVERS = new Set(Object.values(COVER))

/** 6 photos: cover + 5 from the salon's categories (other salons' covers last) + a detail shot. */
export function photosFor(salonId: string, cats: CategoryId[], seed: number): string[] {
  const pool = cats.flatMap((c) => Array.from({ length: N[DIR[c]] }, (_, i) => p(DIR[c], i + 1)))
  const ordered = [...pool.filter((x) => !COVERS.has(x)), ...pool.filter((x) => COVERS.has(x))]
  const cover = COVER[salonId] ?? ordered[0]
  const out = [cover]
  const rest = ordered.filter((x) => x !== cover)
  const k = rest.length ? seed % rest.length : 0
  out.push(...[...rest.slice(k), ...rest.slice(0, k)].slice(0, 4))
  out.push(p('detail', 1 + (seed % N.detail)))
  return [...new Set(out)]
}
