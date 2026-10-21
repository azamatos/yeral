/**
 * Login by phone code, the signed-in person, profile and favourites (client spec §4.7–4.8).
 */
import { z } from 'zod'
import {
  bookingsAheadSchema,
  localeSchema,
  marketLocaleSchema,
  mobileInputSchema,
  phoneInputSchema,
  phoneSchema,
  photoSchema,
} from './common'
import { NAME_MAX } from '@yeral/domain/names'

// ── Login ──

/** `lang`: the site's language, for the SMS text and a new account's language. Codes go to mobile numbers only. */
export const sendCodeSchema = z.object({ phone: mobileInputSchema, lang: marketLocaleSchema.optional() }).meta({ id: 'SendCode' })
export const sendCodeResponseSchema = z.object({
  /** The resend timer ("0:59"). */
  resendAfterSec: z.number().int(),
  expiresInSec: z.number().int(),
  /** The code to show on the screen at the first launch, when no SMS reaches a phone (book Q-036, F-200); absent otherwise. */
  code: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
})

/**
 * What the sign-in screens know before a number is typed: whether the code will show on the screen. While it does, a
 * number proves nothing, so the screens say it's a demo (the first launch, book Q-036, F-200).
 */
export const authModeSchema = z.object({ codeOnScreen: z.boolean() }).meta({ id: 'AuthMode' })

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
    /** The whole name businesses see: the first name and the surname. Null until the first booking asks for it. */
    name: z.string().nullable(),
    /** The two fields behind `name` (book Q-156): the first name, and the surname, which is optional. */
    firstName: z.string().nullable(),
    surname: z.string().nullable(),
    phone: phoneSchema,
    lang: localeSchema,
    notifications: notificationPrefsSchema,
    /** "Profilim": the person's photo, the same in every workspace (book B-12). */
    photo: photoSchema.nullable(),
    /** Has a business workspace ("Biznes" link). */
    hasBusiness: z.boolean(),
    /**
     * Whether "Change number" works here: not while the sign-in code shows on the screen (the first launch, book
     * Q-036), when `/me/phone/code` answers `phone_change_unavailable`.
     */
    canChangePhone: z.boolean(),
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
export const isThisYouSchema = z
  .object({
    isThisYou: z.object({
      /** The account's first name; null when it has none to show (the question is asked without one). */
      name: z.string().nullable(),
      ticket: z.string(),
    }),
  })
  .meta({ id: 'IsThisYou' })

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
    /** Deprecated: one field, split at the first space into the first name and the surname. Use the two below. */
    name: z.string().trim().min(1).max(80).optional(),
    /** The first name (book Q-156), at most 40 characters. */
    firstName: z.string().trim().min(1).max(NAME_MAX).optional(),
    /** The surname, optional (book Q-156): null or empty clears it; at most 40 characters. */
    surname: z.string().trim().max(NAME_MAX).nullable().optional(),
    /** One of the market's languages ("Saýt we SMS habarnamalar şu dilde bolar"). */
    lang: marketLocaleSchema.optional(),
    notifications: notificationPrefsSchema.partial().optional(),
  })
  .refine((x) => x.name === undefined || (x.firstName === undefined && x.surname === undefined), {
    message: 'send name or firstName and surname, not both',
    path: ['name'],
  })
  .meta({ id: 'UpdateMe' })

/** Changing the phone: a code goes to the new number. */
export const changePhoneSchema = verifyCodeSchema

/**
 * What deleting the account touches (book Q-172's confirm): its own bookings and requests ahead, cancelled; and `team`,
 * those it's on as a specialist, which stay with each business for its owner.
 */
export const deletionCountsSchema = bookingsAheadSchema.extend({ team: bookingsAheadSchema }).meta({ id: 'DeletionCounts' })
