/**
 * The Ýeral team's accounts (ADR 0026): set up from a link, signed in with a login, a password and an authenticator
 * code (or a recovery code), invited, reset and turned off by one another. One role (book Q-011).
 *
 * Every hold on an account's row is NO KEY UPDATE, so the foreign keys that point at it (a new action, a session) never
 * wait on it; two accounts are held in one order (by id), so two crossing actions wait instead of deadlocking.
 */
import type { AdminMe, AdminMember, AdminSetupLink } from '@yeral/contract/admin'
import { MARKET } from '@yeral/domain/market'
import { createT } from '@yeral/i18n/fmt'
import { and, asc, eq, gt, inArray, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Queryable } from '../../db/client'
import { adminActions, adminSessions, admins } from '../../db/schema'
import type { Deps } from '../../deps'
import type { Admin } from '../../http/env'
import { ApiError, invalid } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { checkPassword, hashPassword } from '../../lib/password'
import { hit, rateLimited, under } from '../../lib/rate-limit'
import { adminKeys, keyedHash, seal, unseal, type SealingKey } from '../../lib/sealed'
import { base32, matchTotp, newTotpSecret, otpauthUri } from '../../lib/totp'

export const SETUP_HOURS = 24
/** Tries an hour from one address: sign-ins and every setup step. */
export const ADMIN_TRIES_PER_ADDRESS = 30
/**
 * Sign-ins a quarter-hour for one login from one address, right or wrong, any login alike: guessing is slow, a real
 * login can't be told from an unknown one, and nobody elsewhere can lock the account's owner out.
 */
export const ADMIN_TRIES_PER_LOGIN = 10
/**
 * Wrong codes an hour after the right password, from anywhere: only someone with the password can count them, so a
 * stranger can't lock the account's owner out, and its owner and the alerts hear of it.
 */
export const CODE_MISSES_PER_ACCOUNT = 10
export const RECOVERY_CODE_COUNT = 10

/** Starts the session in the transaction that signed in, so a reset or a new password meanwhile can't miss it. */
export type StartSession = (tx: Queryable, admin: Admin) => Promise<void>

type AdminDeps = Pick<Deps, 'db' | 'now' | 'site' | 'adminKey' | 'log'>
type Keys = Awaited<ReturnType<typeof adminKeys>>

const derived = new WeakMap<Uint8Array, Promise<Keys>>()
/** The keys the secrets are sealed and the recovery codes hashed under; no key, no admin tool (`admin_unavailable`). */
function keysOf(deps: Pick<Deps, 'adminKey'>): Promise<Keys> {
  if (!deps.adminKey) throw new ApiError('admin_unavailable')
  let keys = derived.get(deps.adminKey)
  if (!keys) derived.set(deps.adminKey, (keys = adminKeys(deps.adminKey)))
  return keys
}

/** An account's authenticator secret; one sealed under another `ADMIN_SECRET_KEY` makes the admin tool unavailable. */
async function openSecret(deps: Pick<Deps, 'log'>, key: SealingKey, admin: Admin): Promise<Uint8Array<ArrayBuffer>> {
  try {
    return await unseal(key, admin.totpSecret!)
  } catch {
    deps.log.error('admin secret sealed under another ADMIN_SECRET_KEY: reset the account with admin-invite', { login: admin.login })
    throw new ApiError('admin_unavailable')
  }
}

/** What the team did, written down (`admin_actions`); `by` null is the server command. */
export async function recordAction(
  db: Queryable,
  by: Admin | null,
  action: string,
  about: { businessId?: string; reviewId?: string; targetAdminId?: string; reason?: string | null; details?: Record<string, unknown> } = {},
): Promise<void> {
  await db.insert(adminActions).values({ adminId: by?.id ?? null, action, ...about, reason: about.reason ?? null })
}

/** Each try from an address counts, right or wrong; a sign-in also counts for its login from that address. */
export async function guardAddress(deps: Pick<Deps, 'db' | 'now'>, ip: string, login?: string): Promise<void> {
  const limits: [string, number, number][] = [[`admin:ip:${ip}`, ADMIN_TRIES_PER_ADDRESS, 3600]]
  if (login !== undefined) limits.push([`admin:login:${ip}:${login}`, ADMIN_TRIES_PER_LOGIN, 900])
  for (const [key, limit, windowSec] of limits) {
    const r = await hit(deps.db, key, limit, windowSec, deps.now())
    if (!r.ok) throw rateLimited(r.retryAfterSec)
  }
}

// ── recovery codes: 8 letters and digits that can't be mistaken for each other, shown as abcd-efgh ──

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '')
/** Keyed and per account: a copy of the database gives nothing to try them against. */
const recoveryHash = (keys: Keys, adminId: string, code: string) => keyedHash(keys.recovery, `${adminId}:${normalizeRecovery(code)}`)

function newRecoveryCode(): string {
  let out = ''
  const buf = new Uint8Array(1)
  while (out.length < 8) {
    crypto.getRandomValues(buf)
    // the largest multiple of the alphabet's length, so every letter is as likely
    if (buf[0]! < 248) out += RECOVERY_ALPHABET[buf[0]! % RECOVERY_ALPHABET.length]
  }
  return `${out.slice(0, 4)}-${out.slice(4)}`
}

async function freshRecoveryCodes(keys: Keys, adminId: string): Promise<{ codes: string[]; hashes: string[] }> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  return { codes, hashes: await Promise.all(codes.map((code) => recoveryHash(keys, adminId, code))) }
}

// ── holding accounts ──

/** The acting account, held, still active; `unauthorized` once it isn't (turned off or reset meanwhile). */
export async function holdActor(tx: Queryable, by: Admin): Promise<void> {
  const [row] = await tx.select({ status: admins.status }).from(admins).where(eq(admins.id, by.id)).for('no key update')
  if (row?.status !== 'active') throw new ApiError('unauthorized')
}

/** The account acted on, and the actor (still active) with it, held in one order. */
async function holdTarget(tx: Queryable, by: Admin | null, id: string): Promise<Admin> {
  const rows = await tx
    .select()
    .from(admins)
    .where(inArray(admins.id, by ? [by.id, id] : [id]))
    .orderBy(asc(admins.id))
    .for('no key update')
  if (by && rows.find((r) => r.id === by.id)?.status !== 'active') throw new ApiError('unauthorized')
  const target = rows.find((r) => r.id === id)
  if (!target) throw new ApiError('not_found')
  return target
}

// ── setup links ──

async function setupLink(deps: AdminDeps) {
  const token = randomToken()
  return {
    token,
    tokenHash: await sha256Hex(token),
    expiresAt: new Date(deps.now() + SETUP_HOURS * 3_600_000),
    url: `${deps.site.urls.cms}/setup/${token}`,
  }
}

/** The account a setup link is for (held in a transaction); `setup_expired` for one that ran out, was used or never was. */
async function setupRow(db: Queryable, deps: AdminDeps, token: string, hold: boolean): Promise<Admin> {
  const found = db
    .select()
    .from(admins)
    .where(and(eq(admins.setupTokenHash, await sha256Hex(token)), gt(admins.setupExpiresAt, new Date(deps.now()))))
  const [row] = await (hold ? found.for('no key update') : found)
  if (!row || row.status === 'disabled') throw new ApiError('setup_expired')
  return row
}

/** A new account with a setup link; `login_taken` for a login in use. */
export async function inviteAdmin(deps: AdminDeps, by: Admin | null, input: { login: string; name: string }): Promise<AdminSetupLink> {
  await keysOf(deps)
  const link = await setupLink(deps)
  return deps.db.transaction(async (tx) => {
    if (by) await holdActor(tx, by)
    const [row] = await tx
      .insert(admins)
      .values({
        login: input.login,
        name: input.name,
        invitedBy: by?.id ?? null,
        setupTokenHash: link.tokenHash,
        setupExpiresAt: link.expiresAt,
      })
      .onConflictDoNothing({ target: admins.login })
      .returning()
    if (!row) throw new ApiError('login_taken')
    await recordAction(tx, by, 'admin.invited', { targetAdminId: row.id })
    return { id: row.id, url: link.url, expiresAt: link.expiresAt.getTime() }
  })
}

/**
 * A teammate who lost their phone or password, or one turned off, starts again from a new link: their password,
 * secret, recovery codes and sessions go, and an older link with them. Not one's own: that's a new password or new
 * recovery codes.
 */
export async function resetAdmin(deps: AdminDeps, by: Admin | null, id: string): Promise<AdminSetupLink> {
  if (by?.id === id) throw new ApiError('forbidden')
  await keysOf(deps)
  const link = await setupLink(deps)
  return deps.db.transaction(async (tx) => {
    await holdTarget(tx, by, id)
    await tx
      .update(admins)
      .set({
        status: 'invited',
        passwordHash: null,
        totpSecret: null,
        totpLastStep: null,
        recoveryCodes: [],
        setupTokenHash: link.tokenHash,
        setupExpiresAt: link.expiresAt,
      })
      .where(eq(admins.id, id))
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, id))
    await recordAction(tx, by, 'admin.reset', { targetAdminId: id })
    return { id, url: link.url, expiresAt: link.expiresAt.getTime() }
  })
}

/** Turned off: no sign-in, its sessions and setup link gone. Never one's own, so an active account always stays. */
export async function disableAdmin(deps: AdminDeps, by: Admin, id: string): Promise<void> {
  if (by.id === id) throw new ApiError('forbidden')
  await deps.db.transaction(async (tx) => {
    // the actor still active: of two turning each other off at once, the second finds itself off
    await holdTarget(tx, by, id)
    await tx.update(admins).set({ status: 'disabled', setupTokenHash: null, setupExpiresAt: null }).where(eq(admins.id, id))
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, id))
    await recordAction(tx, by, 'admin.disabled', { targetAdminId: id })
  })
}

/** The server command: a new account, or a reset for a login that exists (the way back when nobody can sign in). */
export async function inviteOrReset(deps: AdminDeps, login: string, name: string): Promise<AdminSetupLink & { reset: boolean }> {
  const [row] = await deps.db.select({ id: admins.id }).from(admins).where(eq(admins.login, login))
  if (row) return { ...(await resetAdmin(deps, null, row.id)), reset: true }
  return { ...(await inviteAdmin(deps, null, { login, name })), reset: false }
}

// ── setting up ──

export async function setupOf(deps: AdminDeps, token: string): Promise<{ login: string; name: string }> {
  const row = await setupRow(deps.db, deps, token, false)
  return { login: row.login, name: row.name }
}

/** The password, and a new secret for the authenticator app; asked again, a new secret replaces the last. */
export async function chooseSetupPassword(deps: AdminDeps, token: string, password: string): Promise<{ secret: string; uri: string }> {
  const keys = await keysOf(deps)
  // a link that works before the slow hash, so nobody can make the api hash for nothing
  await setupRow(deps.db, deps, token, false)
  const passwordHash = await hashPassword(password)
  const secret = newTotpSecret()
  const sealed = await seal(keys.sealing, secret)
  return deps.db.transaction(async (tx) => {
    const row = await setupRow(tx, deps, token, true)
    await tx.update(admins).set({ passwordHash, totpSecret: sealed, totpLastStep: null }).where(eq(admins.id, row.id))
    return { secret: base32(secret), uri: otpauthUri(secret, createT(MARKET.defaultLanguage)('common.brand'), row.login) }
  })
}

/** The app's first code confirms it: the account is active, its link used, and its recovery codes shown once. */
export async function confirmSetup(
  deps: AdminDeps,
  token: string,
  code: string,
  startSession: StartSession,
): Promise<{ admin: Admin; codes: string[] }> {
  const keys = await keysOf(deps)
  return deps.db.transaction(async (tx) => {
    const row = await setupRow(tx, deps, token, true)
    if (!row.passwordHash || !row.totpSecret) throw invalid({ path: ['password'], code: 'missing' })
    const step = await matchTotp(await openSecret(deps, keys.sealing, row), code, deps.now(), null)
    if (step === null) throw new ApiError('admin_code_wrong')
    const fresh = await freshRecoveryCodes(keys, row.id)
    const [admin] = await tx
      .update(admins)
      .set({
        status: 'active',
        totpLastStep: step,
        recoveryCodes: fresh.hashes,
        setupTokenHash: null,
        setupExpiresAt: null,
        lastSignInAt: new Date(deps.now()),
      })
      .where(eq(admins.id, row.id))
      .returning()
    await recordAction(tx, admin!, 'admin.set_up', { targetAdminId: row.id })
    await startSession(tx, admin!)
    return { admin: admin!, codes: fresh.codes }
  })
}

// ── signing in ──

let dummy: Promise<string> | undefined
/** A hash to check against when the login is unknown, so a wrong login takes as long as a wrong password. */
const dummyHash = () => (dummy ??= hashPassword(randomToken()))

/**
 * Login, password and the app's code or a recovery code, all at once (ADR 0026). Any wrong part is `sign_in_failed`,
 * for any login; the tries are limited per address and per login from it (`guardAddress`), and wrong codes after the
 * right password per account (`CODE_MISSES_PER_ACCOUNT`). A code works once.
 */
export async function signIn(
  deps: AdminDeps,
  input: { login: string; password: string; code: string },
  startSession: StartSession,
): Promise<Admin> {
  const keys = await keysOf(deps)
  const now = deps.now()
  // the slow password check before any transaction or lock, so tries can't tie up the database's connections
  const [found] = await deps.db.select().from(admins).where(eq(admins.login, input.login))
  const usable = found?.status === 'active' && found.passwordHash && found.totpSecret ? found : null
  // before the password: a secret that won't open says nothing about it
  const secret = usable ? await openSecret(deps, keys.sealing, usable) : null
  const passwordOk = await checkPassword(input.password, usable?.passwordHash ?? (await dummyHash()))
  if (!usable || !secret || !passwordOk) throw new ApiError('sign_in_failed')
  const misses = `admin:code-miss:${usable.id}`
  const admin = await deps.db.transaction(async (tx) => {
    // held: two sign-ins with one code can't both use it; a reset or a new password meanwhile wins
    const [row] = await tx.select().from(admins).where(eq(admins.id, usable.id)).for('no key update')
    if (row?.status !== 'active' || row.passwordHash !== usable.passwordHash || row.totpSecret !== usable.totpSecret) return null
    if (!(await under(tx, misses, CODE_MISSES_PER_ACCOUNT, 3600, now))) return null
    const step = await matchTotp(secret, input.code, now, row.totpLastStep)
    const recovery = step === null ? await recoveryHash(keys, row.id, input.code) : null
    if (step === null && !row.recoveryCodes.includes(recovery!)) {
      await hit(tx, misses, CODE_MISSES_PER_ACCOUNT, 3600, now)
      if (!(await under(tx, misses, CODE_MISSES_PER_ACCOUNT, 3600, now)))
        deps.log.error('admin codes guessed with the right password: the account is held for the hour', { login: row.login })
      return null
    }
    const [signed] = await tx
      .update(admins)
      .set({
        lastSignInAt: new Date(now),
        ...(step !== null ? { totpLastStep: step } : { recoveryCodes: row.recoveryCodes.filter((h) => h !== recovery) }),
      })
      .where(eq(admins.id, row.id))
      .returning()
    await startSession(tx, signed!)
    return signed!
  })
  if (!admin) throw new ApiError('sign_in_failed')
  return admin
}

// ── one's own account ──

export const adminMeOf = (admin: Admin): AdminMe => ({
  id: admin.id,
  login: admin.login,
  name: admin.name,
  recoveryCodesLeft: admin.recoveryCodes.length,
})

/** New recovery codes, for the app's current code; the old ones stop working. */
export async function renewRecoveryCodes(deps: AdminDeps, admin: Admin, code: string): Promise<string[]> {
  const keys = await keysOf(deps)
  return deps.db.transaction(async (tx) => {
    const [row] = await tx.select().from(admins).where(eq(admins.id, admin.id)).for('no key update')
    if (row?.status !== 'active' || !row.totpSecret) throw new ApiError('unauthorized')
    const step = await matchTotp(await openSecret(deps, keys.sealing, row), code, deps.now(), row.totpLastStep)
    if (step === null) throw new ApiError('admin_code_wrong')
    const fresh = await freshRecoveryCodes(keys, row.id)
    await tx.update(admins).set({ totpLastStep: step, recoveryCodes: fresh.hashes }).where(eq(admins.id, admin.id))
    await recordAction(tx, admin, 'admin.recovery_codes', { targetAdminId: admin.id })
    return fresh.codes
  })
}

/** A new password, for the current one; the account's other sessions end. */
export async function changeAdminPassword(
  deps: AdminDeps,
  admin: Admin,
  sessionId: string,
  input: { password: string; newPassword: string },
): Promise<void> {
  const newHash = await hashPassword(input.newPassword)
  await deps.db.transaction(async (tx) => {
    const [row] = await tx.select().from(admins).where(eq(admins.id, admin.id)).for('no key update')
    if (row?.status !== 'active') throw new ApiError('unauthorized')
    if (!row.passwordHash || !(await checkPassword(input.password, row.passwordHash))) throw invalid({ path: ['password'], code: 'wrong' })
    await tx.update(admins).set({ passwordHash: newHash }).where(eq(admins.id, admin.id))
    await tx.delete(adminSessions).where(and(eq(adminSessions.adminId, admin.id), ne(adminSessions.id, sessionId)))
    await recordAction(tx, admin, 'admin.password', { targetAdminId: admin.id })
  })
}

// ── the team ──

const inviter = alias(admins, 'inviter')

export async function adminTeam(db: Queryable): Promise<AdminMember[]> {
  const rows = await db
    .select({ admin: admins, invitedBy: inviter.name })
    .from(admins)
    .leftJoin(inviter, eq(inviter.id, admins.invitedBy))
    .orderBy(asc(admins.createdAt), asc(admins.login))
  return rows.map(({ admin, invitedBy }) => ({
    id: admin.id,
    login: admin.login,
    name: admin.name,
    status: admin.status,
    invitedBy,
    setupExpiresAt: admin.setupExpiresAt?.getTime() ?? null,
    lastSignInAt: admin.lastSignInAt?.getTime() ?? null,
    createdAt: admin.createdAt.getTime(),
  }))
}
