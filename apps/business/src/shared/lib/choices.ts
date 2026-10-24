/**
 * A select's choices with the stored value kept when it isn't one of them (a custom buffer of 45 minutes Settings set,
 * a service's length the wizard doesn't offer), so opening a form never changes it. `null` sorts first.
 */
export function choicesWith<T extends number | null>(options: readonly T[], value: T): T[] {
  if (options.includes(value)) return [...options]
  return [...options, value].sort((a, b) => (a ?? -1) - (b ?? -1))
}
