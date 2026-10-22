/**
 * The setup wizard's category search (B-Onboarding step 2, COMPONENTS.md CategoryPicker): a category matches when its
 * name or its hint («Manicure, pedicure», «Tutor, languages») holds what was typed, ignoring case, so «tutor» finds
 * Lessons and «manicure» Nails.
 */
export function matchesCategory(category: { name: string; hint: string }, query: string): boolean {
  const q = query.trim().toLocaleLowerCase()
  if (!q) return true
  return `${category.name} ${category.hint}`.toLocaleLowerCase().includes(q)
}
