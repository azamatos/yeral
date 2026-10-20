/**
 * Login by phone code, the signed-in person, profile and favourites (client spec §4.7–4.8).
 */
import { z } from 'zod'
import { localeSchema, marketLocaleSchema, mobileInputSchema, phoneInputSchema, phoneSchema } from './common'

// ── Login ──

/** `lang`: the site's language, for the SMS text and a new account's language. Codes go to mobile numbers only. */
export const sendCodeSchema = z.object({ phone: mobileInputSchema, lang: marketLocaleSchema.optional() }).meta({ id: 'SendCode' })
export const sendCodeResponseSchema = z.object({
  /** The resend timer ("0:59"). */
  resendAfterSec: z.number().int(),
  expiresInSec: z.number().int(),
})

export const verifyCodeSchema = z
  .object({
    phone: phoneInputSchema,
    code: z.string().regex(/^\d{4}$/),
    lang: marketLocaleSchema.optional(),
  })
  .meta({ id: 'VerifyCode' })

// ── Me ──

export const notificationPrefsSchema = z.object({
  /** SMS when the business confirms. */
  confirmation: z.boolean(),
  reminderDay: z.boolean(),
  reminder2h: z.boolean(),
  /**
   * Deprecated: there are no review asks (book Q-259). Always false; accepted and ignored on update. Kept so /v1 only
   * grows; it goes with /v2.
   */
  reviewAsk: z.boolean().meta({ deprecated: true, description: 'No review asks (book Q-259): always false, ignored on update.' }),
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

/** The link page's login: the code goes to the booking's own phone, so only the code is sent (book F-068). */
export const linkVerifySchema = z
  .object({ code: z.string().regex(/^\d{4}$/), lang: marketLocaleSchema.optional() })
  .meta({ id: 'LinkVerify' })
export const linkCodeSchema = z.object({ lang: marketLocaleSchema.optional() }).meta({ id: 'LinkCode' })

/**
 * "Is this you?" (book Q-270): the code checked out, but the phone's account hasn't been used for 6 months, so its first
 * name is shown and the person answers with `ticket` before anyone signs in (`POST /v1/auth/identity`). HTTP 202.
 */
export const isThisYouSchema = z.object({ isThisYou: z.object({ name: z.string(), ticket: z.string() }) }).meta({ id: 'IsThisYou' })

/** The answer: yes signs in to that account; no lets it go and starts a fresh one for this phone. */
export const identityAnswerSchema = z
  .object({ ticket: z.string().max(200), yes: z.boolean(), lang: marketLocaleSchema.optional() })
  .meta({ id: 'IdentityAnswer' })

export const verifyCodeResponseSchema = z.object({
  me: meSchema,
  /** First login: ask for the name. */
  isNew: z.boolean(),
})

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    /** One of the market's languages ("Saýt we SMS habarnamalar şu dilde bolar"). */
    lang: marketLocaleSchema.optional(),
    notifications: notificationPrefsSchema.partial().optional(),
  })
  .meta({ id: 'UpdateMe' })

/** Changing the phone: a code goes to the new number. */
export const changePhoneSchema = verifyCodeSchema
