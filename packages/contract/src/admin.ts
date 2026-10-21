/**
 * The Ýeral team's admin tool (book F-178; ADR 0026): its own accounts, signed in with a login, a password and an
 * authenticator code. One role (Q-011): every account can do everything.
 */
import { z } from 'zod'
import { epochSchema, idSchema } from './common'

export const ADMIN_STATUSES = ['invited', 'active', 'disabled'] as const
/** 3–32 characters: lowercase letters, digits, dots and dashes, starting and ending with a letter or digit. */
export const adminLoginSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9.-]{1,30}[a-z0-9]$/)
export const adminPasswordSchema = z.string().min(12).max(128)
/** The authenticator app's 6 digits. */
export const totpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/)

/** Sign in: any wrong part is `sign_in_failed`. `code` is the app's 6 digits or a recovery code (`abcd-efgh`). */
export const adminSignInSchema = z
  .object({
    login: z.string().trim().toLowerCase().max(64),
    password: z.string().max(128),
    code: z.string().trim().max(20),
  })
  .strict()
  .meta({ id: 'AdminSignIn' })

export const adminMeSchema = z
  .object({
    id: idSchema,
    login: z.string(),
    name: z.string(),
    /** Recovery codes not used yet; new ones replace them all. */
    recoveryCodesLeft: z.number().int().min(0),
  })
  .meta({ id: 'AdminMe' })

export const adminMemberSchema = z
  .object({
    id: idSchema,
    login: z.string(),
    name: z.string(),
    status: z.enum(ADMIN_STATUSES),
    /** Who invited them; null for the server command. */
    invitedBy: z.string().nullable(),
    /** A setup link waiting runs out then. */
    setupExpiresAt: epochSchema.nullable(),
    lastSignInAt: epochSchema.nullable(),
    createdAt: epochSchema,
  })
  .meta({ id: 'AdminMember' })

export const adminInviteSchema = z
  .object({ login: adminLoginSchema, name: z.string().trim().min(1).max(80) })
  .strict()
  .meta({ id: 'AdminInvite' })

/** A setup link to hand over in person or a private message: valid 24 hours, shown once. */
export const adminSetupLinkSchema = z.object({ id: idSchema, url: z.string(), expiresAt: epochSchema }).meta({ id: 'AdminSetupLink' })

export const adminIdParamSchema = z.object({ id: idSchema })
export const adminSetupTokenParamSchema = z.object({ token: z.string().min(20).max(100) })

/** What a setup link is for. */
export const adminSetupSchema = z.object({ login: z.string(), name: z.string() }).meta({ id: 'AdminSetup' })
export const adminSetupPasswordSchema = z.object({ password: adminPasswordSchema }).strict().meta({ id: 'AdminSetupPassword' })
/** The secret for the authenticator app: typed in, or read from a QR code of `uri`. Asking again makes a new one. */
export const adminSetupSecretSchema = z.object({ secret: z.string(), uri: z.string() }).meta({ id: 'AdminSetupSecret' })
export const adminSetupConfirmSchema = z.object({ code: totpCodeSchema }).strict().meta({ id: 'AdminSetupConfirm' })

/** 10 one-time codes for a sign-in without the phone: shown once, kept only as hashes. */
export const adminRecoveryCodesSchema = z.object({ codes: z.array(z.string()) }).meta({ id: 'AdminRecoveryCodes' })
export const adminNewRecoveryCodesSchema = z.object({ code: totpCodeSchema }).strict().meta({ id: 'AdminNewRecoveryCodes' })

export const adminPasswordChangeSchema = z
  .object({ password: z.string().max(128), newPassword: adminPasswordSchema })
  .strict()
  .meta({ id: 'AdminPasswordChange' })

export type AdminMe = z.infer<typeof adminMeSchema>
export type AdminMember = z.infer<typeof adminMemberSchema>
export type AdminSetupLink = z.infer<typeof adminSetupLinkSchema>
