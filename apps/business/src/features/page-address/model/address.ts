import { isApiError } from '@yeral/sdk'

/**
 * What's typed in the page address field, as an address (chapter 9, 25.10.2026): lower case, a space or an underscore a
 * hyphen, letter for letter (so the caret stays where it was). Anything else stays as typed, for the check to name.
 */
export const typedAddress = (raw: string) => raw.toLowerCase().replace(/[\s_]/g, '-')

/** A save refused because another business took the address meanwhile (`taken` on `slug`). */
export const takenOnSave = (error: unknown) =>
  isApiError(error, 'validation_error') &&
  Array.isArray(error.details.issues) &&
  error.details.issues.some((i: { path?: unknown[]; code?: unknown }) => i.path?.[0] === 'slug' && i.code === 'taken')
