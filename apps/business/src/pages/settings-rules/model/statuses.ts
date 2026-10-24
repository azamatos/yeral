import type { InternalStatus } from '@yeral/contract/settings'

/**
 * «This name is already used — pick another.»: the name, trimmed and in any case, is a system status's or another
 * internal status's, as the team reads them (`taken`). Case folds as the database's `lower()` does, not by the
 * browser's locale (a Turkish one would make «I» an «ı»).
 */
export function nameTaken(name: string, taken: readonly string[]): boolean {
  const key = name.trim().toLowerCase()
  return !!key && taken.some((t) => t.trim().toLowerCase() === key)
}

/** The name a status shows: a preset worded in the reader's language, the business's own as it wrote it. */
export function statusName(
  status: Pick<InternalStatus, 'preset' | 'name'>,
  preset: (p: NonNullable<InternalStatus['preset']>) => string,
): string {
  return status.preset ? preset(status.preset) : status.name
}
