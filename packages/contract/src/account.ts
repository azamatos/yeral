/**
 * Login by phone code, the signed-in person, profile and favourites (client spec §4.7–4.8).
 */
import { z } from 'zod'
import { localeSchema, phoneInputSchema, phoneSchema } from './common'

// ── Login ──

export const sendCodeSchema = z.object({ phone: phoneInputSchema }).meta({ id: 'SendCode' })
export const sendCodeResponseSchema = z.object({
  /** The resend timer ("0:59"). */
  resendAfterSec: z.number().int(),
  expiresInSec: z.number().int(),
})

export const verifyCodeSchema = z
  .object({
    phone: phoneInputSchema,
    code: z.string().regex(/^\d{4}$/),
  })
  .meta({ id: 'VerifyCode' })

// ── Me ──

export const notificationPrefsSchema = z.object({
  /** SMS when the business confirms. */
  confirmation: z.boolean(),
  reminderDay: z.boolean(),
  reminder2h: z.boolean(),
  reviewAsk: z.boolean(),
})

export const meSchema = z
  .object({
    id: z.string(),
    /** Null until the first booking asks for it. */
    name: z.string().nullable(),
    phone: phoneSchema,
    lang: localeSchema,
    notifications: notificationPrefsSchema,
    /** Has a business workspace ("Biznes" link). */
    hasBusiness: z.boolean(),
  })
  .meta({ id: 'Me' })
export type Me = z.infer<typeof meSchema>

export const verifyCodeResponseSchema = z.object({
  me: meSchema,
  /** First login: ask for the name. */
  isNew: z.boolean(),
})

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    lang: localeSchema.optional(),
    notifications: notificationPrefsSchema.partial().optional(),
  })
  .meta({ id: 'UpdateMe' })

/** Changing the phone: a code goes to the new number. */
export const changePhoneSchema = verifyCodeSchema
