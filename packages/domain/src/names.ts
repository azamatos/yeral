/**
 * A person's name: the first name and the optional surname, stored as two fields (book Q-156). Businesses see it whole;
 * a review is signed "Aýjemal G.", or "Aýjemal" without a surname.
 */
export interface PersonName {
  first: string | null
  surname: string | null
}

/** A one-field name ("Aýjemal Gurbanowa"), as older clients send it: split at the first space. */
export function splitName(full: string | null | undefined): PersonName {
  const text = (full ?? '').trim().replace(/\s+/g, ' ')
  if (!text) return { first: null, surname: null }
  const space = text.indexOf(' ')
  return space < 0 ? { first: text, surname: null } : { first: text.slice(0, space), surname: text.slice(space + 1) }
}

/** "Aýjemal Gurbanowa", or "Aýjemal"; null without a first name. */
export function fullName(name: PersonName): string | null {
  if (!name.first) return null
  return name.surname ? `${name.first} ${name.surname}` : name.first
}

/** The longest first name, and surname, an account keeps. */
export const NAME_MAX = 40

/** A review's signature: "Aýjemal G.", or "Aýjemal" without a surname; the initial whole and upper-case. */
export function reviewName(name: PersonName): string {
  const first = name.first ?? ''
  const initial = name.surname ? Array.from(name.surname.normalize('NFC'))[0]?.toLocaleUpperCase() : undefined
  return initial ? `${first} ${initial}.` : first
}
