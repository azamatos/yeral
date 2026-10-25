/**
 * `/setup/{step}`'s search (the route's `validateSearch`): `another` when someone already in a business asked to create
 * another one (the switcher's «Create a business», Business profile's link), so the wizard skips its "You already have
 * a business" choice (the owner, 25.10.2026). Anything else in the address is dropped.
 */
export type SetupSearch = { another?: true }

export const setupSearch = (search: Record<string, unknown>): SetupSearch => (search.another === true ? { another: true } : {})
