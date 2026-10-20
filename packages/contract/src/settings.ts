/**
 * Business settings (book chapter 7b, B-37–B-43): what the owner and administrators change for their workspace
 * (`/w/{slug}/settings/…`). Specialists don't see them (403). The booking rules first (B-41, B-42).
 */
import {
  AMENITIES,
  CONFIRM_MODES,
  INTERNAL_STATUS_COLORS,
  INTERNAL_STATUS_ICONS,
  INTERNAL_STATUS_PRESETS,
  VERIFICATION_STATUSES,
} from '@yeral/domain/model'
import { REQUEST_ANSWERERS } from '@yeral/domain/rules'
import { GALLERY_MAX } from '@yeral/domain/photos'
import { z } from 'zod'
import { idSchema, latLngSchema, marketLocaleSchema, minuteSchema, phoneInputSchema, phoneSchema, slugSchema, ymdSchema } from './common'

/**
 * The booking rules (B-41). The values each one takes are the settings screen's options (`RULE_OPTIONS` in
 * `@yeral/domain/rules`); anything else is a `validation_error` naming the field.
 */
export const bookingRulesSchema = z
  .object({
    /** "Onlaýn ýazylyş": off, the client page asks people to call; bookings made before don't change. */
    onlineEnabled: z.boolean(),
    /** Each online booking a request, or confirmed at once. */
    confirmMode: z.enum(CONFIRM_MODES),
    /** Who answers requests in manual mode (B-42); the owner always can. */
    requestAnswerers: z.enum(REQUEST_ANSWERERS),
    /** How long a request waits for an answer: 15, 30, 60, 120, 360 or 1440 minutes. */
    holdMinutes: z.number().int(),
    /** The least time before a start: 0 (no limit), 30, 60, 120, 240 or 1440 minutes. */
    leadMinutes: z.number().int(),
    /** How many days ahead the calendar is open: 7, 14, 30, 60 or 90. */
    windowDays: z.number().int(),
    /** Free time after a visit: 0–120 minutes; a service may set its own. */
    bufferMinutes: z.number().int(),
    /** Start times every 15 or 30 minutes. */
    slotStep: z.number().int(),
    /** A client may cancel or move until this many minutes before: 60, 120, 360, 720, 1440, 2880; null = any time. */
    cancelWindowMinutes: z.number().int().nullable(),
    /** "Ýatyrylanda sebäp sora": ask the client why they cancel. */
    askCancelReason: z.boolean(),
    /** After this many no-shows a client books only by phone: 0 (never) to 5. */
    blockAfterNoShows: z.number().int(),
    /** How late a client may be: 15 minutes everywhere in the MVP (book Q-118); not a setting yet (F-103). */
    lateMinutes: z.number().int(),
  })
  .meta({ id: 'BookingRules' })

/** Change some of the rules; the others stay. Changing the mode or the hold leaves waiting requests as they are (Q-205). */
export const bookingRulesUpdateSchema = bookingRulesSchema.omit({ lateMinutes: true }).partial().strict().meta({ id: 'BookingRulesUpdate' })

/** Where the business is: one address per workspace (a second place is a business of its own). */
export const locationSchema = latLngSchema.extend({
  /** One of the market's cities (`GET /v1/cities`). */
  cityId: z.string().max(40),
  /** The street address, without the city: "Oguzhan köçesi 12". */
  address: z.string().trim().min(1).max(200),
  /** The street line on search rows, and all a home-based business shows before a booking is confirmed. */
  street: z.string().trim().min(1).max(120),
})

/**
 * The business profile (B-37): what the public page says. The logo and photos come with uploads (F-084, F-101). The
 * owner and administrators ("change business settings").
 */
export const businessProfileSchema = z
  .object({
    slug: slugSchema,
    /** As clients see it in search, on bookings and in SMS. */
    name: z.string(),
    /** It sets how the business is found and booked: a change keeps the kind of booking. */
    categoryId: z.string(),
    /** "Näme edýärsiňiz…", per language as written. */
    about: z.partialRecord(marketLocaleSchema, z.string()),
    /** "Habarlaşmak telefony": the page's "Jaň et" calls it. */
    phone: phoneSchema,
    amenities: z.array(z.enum(AMENITIES)),
    /** "Diňe aýallar üçin". */
    womenOnly: z.boolean(),
    location: locationSchema,
    /** "Floor, room": the address's floor or room; a change isn't a move (Q-215). */
    floor: z.string().nullable(),
    /** "Girelge nirede?" */
    entranceNote: z.string().nullable(),
    /** "Takyk salgyny diňe ýazylyş tassyklanandan soň görkez": home-based. */
    hideExactAddress: z.boolean(),
    /** Only a verified page is public; an address change asks the Ýeral team to check again (Q-215). */
    verification: z.enum(VERIFICATION_STATUSES),
  })
  .meta({ id: 'BusinessProfile' })

/** Change some of the profile; a new location is given whole. */
export const businessProfileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    categoryId: z.string().max(40),
    /** Only the languages sent change; an empty text removes that language (one must stay). */
    about: z.partialRecord(marketLocaleSchema, z.string().trim().max(1000)),
    phone: phoneInputSchema,
    /** The list's amenities on; any the list doesn't know stay as they are. */
    amenities: z.array(z.enum(AMENITIES)).refine((a) => new Set(a).size === a.length, 'Each amenity at most once'),
    womenOnly: z.boolean(),
    location: locationSchema.strict(),
    /** Empty = none. */
    floor: z
      .string()
      .trim()
      .max(40)
      .nullable()
      .transform((floor) => floor || null),
    /** Empty = none. */
    entranceNote: z
      .string()
      .trim()
      .max(200)
      .nullable()
      .transform((note) => note || null),
    hideExactAddress: z.boolean(),
  })
  .partial()
  .strict()
  .meta({ id: 'BusinessProfileUpdate' })

// ── The gallery (B-37, Q-115) ──

/** A gallery photo id: the end of its key. */
const photoIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/)
export const galleryPhotoParamSchema = z.object({ slug: slugSchema, id: photoIdSchema })

/** "Suratlar": up to 20, the first the cover on every card and page. */
export const gallerySchema = z
  .object({ items: z.array(z.object({ id: photoIdSchema, url: z.string(), alt: z.string() })) })
  .meta({ id: 'Gallery' })

/** The gallery in a new order: every photo it has, once. */
export const galleryOrderSchema = z
  .object({ ids: z.array(photoIdSchema).max(GALLERY_MAX) })
  .strict()
  .meta({ id: 'GalleryOrder' })

// ── Hours and special days (B-39, B-40) ──

/** The hours' pickers run in 30-minute steps from 00:00 (book Q-128). */
export const HOURS_STEP = 30
export const hoursMinuteSchema = minuteSchema.refine((m) => m % HOURS_STEP === 0, `Every ${HOURS_STEP} minutes`)

/** A weekday: from–to (the end may pass midnight, up to 48:00) and one optional break. */
export const weekdayHoursSchema = z.object({
  open: hoursMinuteSchema,
  close: hoursMinuteSchema,
  break: z.object({ start: hoursMinuteSchema, end: hoursMinuteSchema }).nullable(),
})

/**
 * A holiday or an unusual day (B-40): its name (clients see it if a booking is cancelled for it), the dates, yearly or
 * not, and closed (`hours` null) or other hours.
 */
export const specialDaySettingSchema = z.object({
  name: z.string().trim().min(1).max(40),
  from: ymdSchema,
  to: ymdSchema,
  yearly: z.boolean(),
  hours: z.object({ open: hoursMinuteSchema, close: hoursMinuteSchema }).nullable(),
})

/** "Iş wagty" and "Aýratyn günler": Monday first, null = closed that weekday. */
export const businessHoursSettingsSchema = z
  .object({
    hours: z.array(weekdayHoursSchema.nullable()).length(7),
    specialDays: z.array(specialDaySettingSchema).max(100),
  })
  .meta({ id: 'BusinessHoursSettings' })

/**
 * The week and every special day, saved at once (the special-day modal sends the list with its day added or taken out).
 * Bookings ahead that the change leaves outside the hours make it 409 `bookings_affected`, saving nothing; it's sent
 * again with the team's choice (book Q-211): `keep` them, or `cancel` them with 3 other times offered to each client.
 */
export const businessHoursUpdateSchema = businessHoursSettingsSchema
  .extend({ affected: z.enum(['keep', 'cancel']).optional() })
  .strict()
  .meta({ id: 'BusinessHoursUpdate' })

export const businessHoursResultSchema = businessHoursSettingsSchema
  .extend({
    /** Bookings cancelled with offered times: "3 müşderä SMS iberildi". */
    cancelled: z.number().int(),
  })
  .meta({ id: 'BusinessHoursResult' })

// ── Internal statuses (B-29, F-104) ──

/**
 * A team-only marker for confirmed bookings ("Geldi", "Başlandy"): never shown to clients, never changes the booking's
 * status. A preset (`arrived`, `started`) is worded by the app in the reader's language; its `name` is the market's.
 */
export const internalStatusSchema = z
  .object({
    id: idSchema,
    preset: z.enum(INTERNAL_STATUS_PRESETS).nullable(),
    name: z.string(),
    icon: z.enum(INTERNAL_STATUS_ICONS),
    color: z.enum(INTERNAL_STATUS_COLORS),
    enabled: z.boolean(),
  })
  .meta({ id: 'InternalStatus' })
export type InternalStatus = z.infer<typeof internalStatusSchema>

/** "Ýazylyş ýagdaýlary": the presets first, then the business's own; "2 / 5 · you can add 3 more". */
export const internalStatusListSchema = z
  .object({ items: z.array(internalStatusSchema), max: z.number().int() })
  .meta({ id: 'InternalStatusList' })

/** "Ýagdaý goş": a name not taken ("Bu at eýýäm bar"), an icon, a colour; the sixth is refused (`statuses_full`). */
export const internalStatusInputSchema = z
  .object({
    name: z.string().trim().min(1).max(20),
    icon: z.enum(INTERNAL_STATUS_ICONS),
    color: z.enum(INTERNAL_STATUS_COLORS),
    enabled: z.boolean().default(true),
  })
  .strict()
  .meta({ id: 'InternalStatusInput' })

/** A preset keeps its name; any status may be switched on or off, or take another icon or colour. Nothing left out changes. */
export const internalStatusUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(20).optional(),
    icon: z.enum(INTERNAL_STATUS_ICONS).optional(),
    color: z.enum(INTERNAL_STATUS_COLORS).optional(),
    enabled: z.boolean().optional(),
  })
  .strict()
  .meta({ id: 'InternalStatusUpdate' })
export const internalStatusParamSchema = z.object({ slug: slugSchema, id: idSchema })
