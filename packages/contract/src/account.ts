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
  ymdSchema,
} from './common'
import { NAME_MAX } from '@yeral/domain/names'

// ── Login ──

/** `lang`: the site's language, for the SMS text and a new account's language. Codes go to mobile numbers only. */
export const sendCodeSchema = z
  .object({
    phone: mobileInputSchema,
    lang: marketLocaleSchema.optional(),
    /** The number's Telegram is lost (a new account, a blocked bot): ask for a new link to a chat even though one is stored (ADR 0029). */
    relink: z.boolean().optional(),
  })
  .meta({ id: 'SendCode' })

/**
 * How a sign-in code reaches the person (ADR 0029): `screen`, shown in the answer at the first launch, when nothing
 * reaches a phone (book Q-036, F-200); `sms`, sent to the phone (locally: the log); `telegram`, sent to the Telegram
 * chat linked to the number; `telegram_link`, the number isn't linked yet: the answer carries the link to open in
 * Telegram, where "Share my number" links it and brings the code (the code then types in as usual).
 */
export const codeDeliverySchema = z.enum(['screen', 'sms', 'telegram', 'telegram_link']).meta({ id: 'CodeDelivery' })
export type CodeDelivery = z.infer<typeof codeDeliverySchema>

const codeTimers = {
  /** The resend timer ("0:59"). */
  resendAfterSec: z.number().int(),
  expiresInSec: z.number().int(),
}
/** One of four by `delivery` (`CodeDelivery`); the timers are in every one. */
export const sendCodeResponseSchema = z
  .discriminatedUnion('delivery', [
    z.object({
      ...codeTimers,
      delivery: z.literal('screen'),
      /** The code to show on the screen (the first launch, book Q-036, F-200). */
      code: z.string().regex(/^\d{4}$/),
    }),
    z.object({ ...codeTimers, delivery: z.literal('sms') }),
    z.object({
      ...codeTimers,
      delivery: z.literal('telegram'),
      /** `https://t.me/<bot>`: the chat the code arrived in, for «Open Telegram». */
      link: z.url(),
    }),
    z.object({
      ...codeTimers,
      delivery: z.literal('telegram_link'),
      /** `https://t.me/<bot>?start=<nonce>`: good for 10 minutes, for this number only. */
      link: z.url(),
    }),
  ])
  .meta({ id: 'SentCode' })
export type SentCode = z.infer<typeof sendCodeResponseSchema>

/**
 * What the sign-in screens know before a number is typed: how the code will come (`delivery`; never `telegram_link`,
 * which depends on the number). While it shows on the screen (`codeOnScreen`, the same as `delivery === 'screen'`), a
 * number proves nothing, so the screens say the code shows here (the first launch, book Q-036, F-200).
 */
export const authModeSchema = z
  .object({ codeOnScreen: z.boolean(), delivery: z.enum(['screen', 'sms', 'telegram']) })
  .meta({ id: 'AuthMode' })

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

/**
 * "Trusted on Ýeral" as the account sees it (design v0.7 · D, `GET /v1/me/trusted`): the mark, or how far they are
 * («2 more visits…»), or that it's paused since a missed booking. `visits` counts toward `TRUSTED_MIN_VISITS`: every
 * completed visit on Ýeral, or those after the strike while it counts.
 */
export const trustedStandingSchema = z
  .object({
    state: z.enum(['trusted', 'almost', 'paused']),
    visits: z.number().int(),
    /** The day of the no-show or report that paused it; null unless `paused`. */
    pausedSince: ymdSchema.nullable(),
  })
  .meta({ id: 'TrustedStanding' })
export type TrustedStandingView = z.infer<typeof trustedStandingSchema>

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
