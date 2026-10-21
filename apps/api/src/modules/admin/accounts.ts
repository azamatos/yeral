/**
 * The Ýeral team's accounts (ADR 0026): set up from a link, signed in with a login, a password and an authenticator
 * code (or a recovery code), invited, reset and turned off by one another. One role (book Q-011).
 */
import type { AdminMe, AdminMember, AdminSetupLink } from '@yeral/contract/admin'
import { MARKET } from '@yeral/domain/market'
import { createT } from '@yeral/i18n/fmt'
import { and, asc, eq, gt, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Queryable } from '../../db/client'
import { adminActions, adminSessions, admins } from '../../db/schema'
import type { Deps } from '../../deps'
import type { Admin } from '../../http/env'
import { ApiError, invalid } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { checkPassword, hashPassword } from '../../lib/password'
import { hit, rateLimited } from '../../lib/rate-limit'
import { seal, sealingKey, unseal, type SealingKey } from '../../lib/sealed'
import { base32, matchTotp, newTotpSecret, otpauthUri } from '../../lib/totp'

export const SETUP_HOURS = 24
/** Wrong sign-ins in a row before the account locks, and for how long. */
export const MAX_FAILED_SIGN_INS = 10
export const LOCK_MINUTES = 15
/** Sign-ins and setup codes an hour from one address. */
export const ADMIN_TRIES_PER_ADDRESS = 30
export const RECOVERY_CODE_COUNT = 10

type AdminDeps = Pick<Deps, 'db' | 'now' | 'site' | 'adminKey'>

const keys = new WeakMap<Uint8Array, Promise<SealingKey>>()
/** The key the secrets are sealed under; no key, no admin tool (`admin_unavailable`). */
function sealer(deps: Pick<Deps, 'adminKey'>): Promise<SealingKey> {
  if (!deps.adminKey) throw new ApiError('admin_unavailable')
  let key = keys.get(deps.adminKey)
  if (!key) keys.set(deps.adminKey, (key = sealingKey(deps.adminKey)))
  return key
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

/** Each try from an address counts, right or wrong. */
export async function guardAddress(deps: Pick<Deps, 'db' | 'now'>, ip: string): Promise<void> {
  const r = await hit(deps.db, `admin:ip:${ip}`, ADMIN_TRIES_PER_ADDRESS, 3600, deps.now())
  if (!r.ok) throw rateLimited(r.retryAfterSec)
}

// ── recovery codes: 8 letters and digits that can't be mistaken for each other, shown as abcd-efgh ──

const RECOVERY_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const normalizeRecovery = (code: string) => code.toLowerCase().replace(/[^a-z0-9]/g, '')
const recoveryHash = (code: string) => sha256Hex(`recovery:${normalizeRecovery(code)}`)

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

async function freshRecoveryCodes(): Promise<{ codes: string[]; hashes: string[] }> {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, newRecoveryCode)
  return { codes, hashes: await Promise.all(codes.map(recoveryHash)) }
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

/** The account a setup link is for, held; `setup_expired` for one that ran out, was used or never was. */
async function setupRow(tx: Queryable, deps: AdminDeps, token: string): Promise<Admin> {
  const [row] = await tx
    .select()
    .from(admins)
    .where(and(eq(admins.setupTokenHash, await sha256Hex(token)), gt(admins.setupExpiresAt, new Date(deps.now()))))
    .for('update')
  if (!row || row.status === 'disabled') throw new ApiError('setup_expired')
  return row
}

/** A new account with a setup link; `login_taken` for a login in use. */
export async function inviteAdmin(deps: AdminDeps, by: Admin | null, input: { login: string; name: string }): Promise<AdminSetupLink> {
  await sealer(deps)
  const link = await setupLink(deps)
  return deps.db.transaction(async (tx) => {
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
 * secret, recovery codes and sessions go. Not one's own: that's a new password or new recovery codes.
 */
export async function resetAdmin(deps: AdminDeps, by: Admin | null, id: string): Promise<AdminSetupLink> {
  if (by?.id === id) throw new ApiError('forbidden')
  await sealer(deps)
  const link = await setupLink(deps)
  return deps.db.transaction(async (tx) => {
    const [row] = await tx.select().from(admins).where(eq(admins.id, id)).for('update')
    if (!row) throw new ApiError('not_found')
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
        failedSignIns: 0,
        lockedUntil: null,
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
    // the active accounts held in one order, so two turning each other off at once can't leave none
    const active = await tx.select({ id: admins.id }).from(admins).where(eq(admins.status, 'active')).orderBy(asc(admins.id)).for('update')
    if (!active.some((a) => a.id === by.id)) throw new ApiError('unauthorized')
    const [row] = await tx.select().from(admins).where(eq(admins.id, id)).for('update')
    if (!row) throw new ApiError('not_found')
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
  return deps.db.transaction(async (tx) => {
    const row = await setupRow(tx, deps, token)
    return { login: row.login, name: row.name }
  })
}

/** The password, and a new secret for the authenticator app; asked again, a new secret replaces the last. */
export async function chooseSetupPassword(deps: AdminDeps, token: string, password: string): Promise<{ secret: string; uri: string }> {
  const key = await sealer(deps)
  const passwordHash = await hashPassword(password)
  const secret = newTotpSecret()
  const sealed = await seal(key, secret)
  return deps.db.transaction(async (tx) => {
    const row = await setupRow(tx, deps, token)
    await tx.update(admins).set({ passwordHash, totpSecret: sealed, totpLastStep: null }).where(eq(admins.id, row.id))
    return { secret: base32(secret), uri: otpauthUri(secret, createT(MARKET.defaultLanguage)('common.brand'), row.login) }
  })
}

/** The app's first code confirms it: the account is active, its link used, and its recovery codes shown once. */
export async function confirmSetup(deps: AdminDeps, token: string, code: string): Promise<{ admin: Admin; codes: string[] }> {
  const key = await sealer(deps)
  const fresh = await freshRecoveryCodes()
  return deps.db.transaction(async (tx) => {
    const row = await setupRow(tx, deps, token)
    if (!row.passwordHash || !row.totpSecret) throw invalid({ path: ['password'], code: 'missing' })
    const step = await matchTotp(await unseal(key, row.totpSecret), code, deps.now(), null)
    if (step === null) throw new ApiError('admin_code_wrong')
    const [admin] = await tx
      .update(admins)
      .set({
        status: 'active',
        totpLastStep: step,
        recoveryCodes: fresh.hashes,
        setupTokenHash: null,
        setupExpiresAt: null,
        failedSignIns: 0,
        lockedUntil: null,
        lastSignInAt: new Date(deps.now()),
      })
      .where(eq(admins.id, row.id))
      .returning()
    await recordAction(tx, admin!, 'admin.set_up', { targetAdminId: row.id })
    return { admin: admin!, codes: fresh.codes }
  })
}

// ── signing in ──

let dummy: Promise<string> | undefined
/** A hash to check against when the login is unknown, so a wrong login takes as long as a wrong password. */
const dummyHash = () => (dummy ??= hashPassword(randomToken()))

/**
 * Login, password and the app's code or a recovery code, all at once (ADR 0026). Any wrong part is `sign_in_failed`;
 * 10 wrong in a row lock the account for 15 minutes (`too_many_attempts`). A code works once.
 */
export async function signIn(deps: AdminDeps, input: { login: string; password: string; code: string }): Promise<Admin> {
  const key = await sealer(deps)
  const now = deps.now()
  const outcome = await deps.db.transaction(async (tx) => {
    // held: two sign-ins with one code can't both use it
    const [row] = await tx.select().from(admins).where(eq(admins.login, input.login)).for('update')
    if (!row || row.status !== 'active' || !row.passwordHash || !row.totpSecret) {
      await checkPassword(input.password, await dummyHash())
      return { kind: 'failed' } as const
    }
    if (row.lockedUntil && row.lockedUntil.getTime() > now) return { kind: 'locked', until: row.lockedUntil.getTime() } as const
    const passwordOk = await checkPassword(input.password, row.passwordHash)
    const step = passwordOk ? await matchTotp(await unseal(key, row.totpSecret), input.code, now, row.totpLastStep) : null
    const recovery = passwordOk && step === null ? await recoveryHash(input.code) : null
    if (step === null && !(recovery && row.recoveryCodes.includes(recovery))) {
      const failed = row.failedSignIns + 1
      await tx
        .update(admins)
        .set(
          failed >= MAX_FAILED_SIGN_INS
            ? { failedSignIns: 0, lockedUntil: new Date(now + LOCK_MINUTES * 60_000) }
            : { failedSignIns: failed },
        )
        .where(eq(admins.id, row.id))
      return { kind: 'failed' } as const
    }
    const [admin] = await tx
      .update(admins)
      .set({
        failedSignIns: 0,
        lockedUntil: null,
        lastSignInAt: new Date(now),
        ...(step !== null ? { totpLastStep: step } : { recoveryCodes: row.recoveryCodes.filter((h) => h !== recovery) }),
      })
      .where(eq(admins.id, row.id))
      .returning()
    return { kind: 'ok', admin: admin! } as const
  })
  if (outcome.kind === 'locked') throw new ApiError('too_many_attempts', { retryAfterSec: Math.ceil((outcome.until - now) / 1000) })
  if (outcome.kind === 'failed') throw new ApiError('sign_in_failed')
  return outcome.admin
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
  const key = await sealer(deps)
  const fresh = await freshRecoveryCodes()
  return deps.db.transaction(async (tx) => {
    const [row] = await tx.select().from(admins).where(eq(admins.id, admin.id)).for('update')
    if (!row?.totpSecret) throw new ApiError('unauthorized')
    const step = await matchTotp(await unseal(key, row.totpSecret), code, deps.now(), row.totpLastStep)
    if (step === null) throw new ApiError('admin_code_wrong')
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
    const [row] = await tx.select().from(admins).where(eq(admins.id, admin.id)).for('update')
    if (!row?.passwordHash || !(await checkPassword(input.password, row.passwordHash))) throw invalid({ path: ['password'], code: 'wrong' })
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
