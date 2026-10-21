/**
 * The Ýeral team's admin tool (book F-178; ADR 0026): its own accounts, signed in with a login, a password and an
 * authenticator code. One role (Q-011): every account can do everything.
 */
import { REVIEW_REPORT_REASONS, VERIFICATION_STATUSES } from '@yeral/domain/model'
import { z } from 'zod'
import { NAME_MAX } from '@yeral/domain/names'
import { SETUP_STEPS } from '@yeral/domain/setup'
import {
  cityRefSchema,
  epochSchema,
  idSchema,
  langQuerySchema,
  latLngSchema,
  marketLocaleSchema,
  mobileInputSchema,
  photoSchema,
} from './common'
import { setupStartSchema } from './setup'

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

// ── businesses (book F-179, S-17; Q-274, Q-275, Q-276, Q-012, Q-215) ──

/**
 * The lists: `review` the finished businesses waiting (the longest waiting first), `moved` verified ones to check again
 * after a move, `rejected` sent back, `hidden` hidden by the team, `verified` the live ones (public), `closed` those closed
 * as their owner asked, `setup` drafts still being set up (one the team added for its owner, F-238), `all` a search
 * across the finished ones.
 */
export const ADMIN_BUSINESS_VIEWS = ['review', 'moved', 'rejected', 'hidden', 'verified', 'closed', 'setup', 'all'] as const
export type AdminBusinessView = (typeof ADMIN_BUSINESS_VIEWS)[number]
export const adminBusinessesQuerySchema = langQuerySchema.extend({
  view: z.enum(ADMIN_BUSINESS_VIEWS).default('review'),
  /** The name, the page address or the phone. */
  q: z.string().trim().max(80).optional(),
})
export const adminBusinessParamSchema = z.object({ id: idSchema })
/** `moved`: the `addressChangedAt` the team looked at, for a move checked again (a newer move is `invalid_status`). */
export const adminVerifyQuerySchema = z.object({ moved: z.coerce.number().int().optional() })

export const adminBusinessItemSchema = z
  .object({
    id: idSchema,
    slug: z.string(),
    name: z.string(),
    category: z.object({ id: z.string(), name: z.string() }),
    city: cityRefSchema,
    address: z.string(),
    /** The business phone the team calls before verifying (Q-276). */
    phone: z.string(),
    owner: z.object({ name: z.string().nullable(), phone: z.string() }).nullable(),
    verification: z.enum(VERIFICATION_STATUSES),
    /** Why it was sent back, as the owner reads it. */
    reason: z.string().nullable(),
    hidden: z.object({ at: epochSchema, reason: z.string() }).nullable(),
    /** Closed as its owner asked (Q-213). */
    closed: z.object({ at: epochSchema, reason: z.string() }).nullable(),
    /** A verified business moved: check it again (Q-215). */
    addressChangedAt: epochSchema.nullable(),
    /** When it was finished or sent again: the queue's order. */
    sentForReviewAt: epochSchema,
    /** A draft: the wizard's step its owner reopens at (Q-200); null once finished. */
    setupStep: z.enum(SETUP_STEPS).nullable(),
    createdAt: epochSchema,
  })
  .meta({ id: 'AdminBusinessItem' })

/** What the team checks (Q-276): the name, the address on the map, the category, the photos; what happened so far. */
export const adminBusinessSchema = adminBusinessItemSchema
  .extend({
    about: z.partialRecord(marketLocaleSchema, z.string()),
    location: latLngSchema,
    floor: z.string().nullable(),
    entranceNote: z.string().nullable(),
    hideExactAddress: z.boolean(),
    photos: z.array(photoSchema),
    /** Services on its menu, and people on its team. */
    services: z.number().int(),
    team: z.number().int(),
    history: z.array(z.object({ status: z.enum(VERIFICATION_STATUSES), reason: z.string().nullable(), at: epochSchema })),
    /** What the team did with it, the newest first; `by` null for the server command. */
    actions: z.array(z.object({ action: z.string(), by: z.string().nullable(), reason: z.string().nullable(), at: epochSchema })),
  })
  .meta({ id: 'AdminBusiness' })

/**
 * A business the team adds for an owner it has met (F-238, Q-002): its name and category, and the owner, by the phone
 * they sign in with and their name. It's a draft their sign-in reopens at its next step (Q-200).
 */
export const adminAddBusinessSchema = setupStartSchema
  .extend({
    owner: z
      .object({
        /** A mobile: they sign in with it. */
        phone: mobileInputSchema,
        /** The language they speak, for the SMS until they choose one; the market's main one by default. */
        lang: marketLocaleSchema.optional(),
        name: z
          .string()
          .trim()
          .min(1)
          .max(NAME_MAX * 2),
      })
      .strict(),
  })
  .strict()
  .meta({ id: 'AdminAddBusiness' })

/** Why: the owner reads it as written. */
export const adminReasonSchema = z
  .object({ reason: z.string().trim().min(1).max(500) })
  .strict()
  .meta({ id: 'AdminReason' })

// ── reported reviews (book ROUND6 F2, Q-261, Q-262) ──

/** `reported` waiting for Ýeral (the longest waiting first; after 48 hours they count again meanwhile), `cleared` kept, `removed`. */
export const ADMIN_REVIEW_VIEWS = ['reported', 'cleared', 'removed'] as const
export const adminReviewsQuerySchema = z.object({ view: z.enum(ADMIN_REVIEW_VIEWS).default('reported') })
export const adminReviewParamSchema = z.object({ id: idSchema })

export const adminReviewSchema = z
  .object({
    id: idSchema,
    business: z.object({ id: idSchema, slug: z.string(), name: z.string() }),
    author: z.string(),
    rating: z.number().int().min(1).max(5),
    tags: z.array(z.string()),
    text: z.string().nullable(),
    /** "Aýal saç kesimi · Aýna": the visit it's about. */
    what: z.string(),
    createdAt: epochSchema,
    /** The business's reply, as clients read it. */
    reply: z.string().nullable(),
    report: z
      .object({
        reason: z.enum(REVIEW_REPORT_REASONS),
        text: z.string().nullable(),
        at: epochSchema,
        /** Who on the business's team reported it. */
        by: z.string().nullable(),
        /** It counts in the rating again then, if Ýeral hasn't decided (Q-261). */
        countsAgainAt: epochSchema,
        counted: z.boolean(),
      })
      .nullable(),
    clearedAt: epochSchema.nullable(),
    removed: z.object({ at: epochSchema, reason: z.string() }).nullable(),
  })
  .meta({ id: 'AdminReview' })

export type AdminMe = z.infer<typeof adminMeSchema>
export type AdminMember = z.infer<typeof adminMemberSchema>
export type AdminSetupLink = z.infer<typeof adminSetupLinkSchema>
export type AdminBusinessItem = z.infer<typeof adminBusinessItemSchema>
export type AdminBusiness = z.infer<typeof adminBusinessSchema>
export type AdminReview = z.infer<typeof adminReviewSchema>
