/**
 * Where the apps answer. CI's Docker stack (infra/docker/compose.yml) serves them on `*.yeral.localhost` through
 * Caddy; a developer points the tests at dev servers with `E2E_CLIENT_URL=http://localhost:3401
 * E2E_BUSINESS_URL=http://localhost:3402` (PORT_BASE + 1 and + 2).
 */
export const CLIENT_URL = (process.env.E2E_CLIENT_URL ?? 'http://yeral.localhost').replace(/\/$/, '')
export const BUSINESS_URL = (process.env.E2E_BUSINESS_URL ?? 'http://business.yeral.localhost').replace(/\/$/, '')
/** The api, for the test hook that lets a booking's time pass (`E2E_HOOKS`; `http://localhost:3504` for `PORT_BASE=3500`). */
export const API_URL = (process.env.E2E_API_URL ?? 'http://api.yeral.localhost').replace(/\/$/, '')

/**
 * The demo seed's salon (apps/api/src/db/seed/demo-data.ts): verified, so clients may book it, and confirming by
 * hand (`confirmMode: 'manual'`, hold 30 min), so a booking waits for the owner. Its owner signs in with the seed's
 * number and the code on the screen.
 */
export const SALON = { slug: 'glow-studio', name: 'Glow Studio', ownerPhone: '65102030' }

/**
 * A number nobody has used: each run signs a new client up (the market's mobile prefixes 61–65, 8 digits;
 * `@yeral/domain/market`). Nothing is cleaned up afterwards: the next run brings its own number and books a free time.
 */
export function freshPhone(): string {
  const prefix = 61 + Math.floor(Math.random() * 5)
  return `${prefix}${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`
}

/** The owner's signed-in session, saved by `tests/owner.setup.ts` for the flows (ignored by git). */
export const OWNER_STATE = new URL('../.auth/owner.json', import.meta.url).pathname

/** The name the client gives at sign-up: unique per run, so its booking stands out on the owner's calendar. */
export const clientName = (phone: string) => `Test ${phone.slice(-4)}`
