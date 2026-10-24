import type { InternalStatus } from '@yeral/contract/settings'

/** «Ýagdaý goş»'s name: up to 20 characters (book B-29). */
export const STATUS_NAME_MAX = 20

/**
 * «This name is already used — pick another.»: the name, trimmed and in any case, is a system status's or another
 * internal status's, as the team reads them (`taken`).
 */
export function nameTaken(name: string, taken: readonly string[]): boolean {
  const key = name.trim().toLocaleLowerCase()
  return !!key && taken.some((t) => t.trim().toLocaleLowerCase() === key)
}

/** The name a status shows: a preset worded in the reader's language, the business's own as it wrote it. */
export function statusName(
  status: Pick<InternalStatus, 'preset' | 'name'>,
  preset: (p: NonNullable<InternalStatus['preset']>) => string,
): string {
  return status.preset ? preset(status.preset) : status.name
}
