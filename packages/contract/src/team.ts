/**
 * The business team (book chapter 3; ADR 0025): the workspaces a person works in, their invites, and the team the
 * owner manages. Workspace endpoints live under `/v1/w/{slug}`; a hidden part answers 403 `forbidden`, a workspace the
 * person isn't on 404 `not_found`.
 */
import { LEVELS } from '@yeral/domain/permissions'
import { STAFF_STATUSES } from '@yeral/domain/model'
import { REQUEST_ANSWERERS } from '@yeral/domain/rules'
import { z } from 'zod'
import {
  bookingCodeSchema,
  cityRefSchema,
  epochSchema,
  idSchema,
  localizedSchema,
  mobileInputSchema,
  phoneInputSchema,
  phoneSchema,
  photoSchema,
  minuteSchema,
  slugSchema,
  uniqueIdsSchema,
  ymdSchema,
} from './common'
import { hoursMinuteSchema } from './settings'

export const levelSchema = z.enum(LEVELS)
/** The levels an owner gives; there is exactly one owner. */
export const assignableLevelSchema = z.enum(['admin', 'specialist'])
/** `expired`: unanswered past its 7 days. */
export const inviteStateSchema = z.enum(['pending', 'expired', 'accepted', 'declined', 'cancelled'])

// ── The person's workspaces (switcher) ──

export const workspaceSchema = z
  .object({
    slug: slugSchema,
    name: z.string(),
    address: z.string(),
    /** Branches are businesses of their own: the city tells two on the same street name apart (book Q-107). */
    city: cityRefSchema,
    photo: photoSchema.nullable(),
    level: levelSchema,
    /** Requests waiting for an answer this person may give: the count in the switcher. */
    requestsToAnswer: z.number().int().min(0),
    lastOpenedAt: epochSchema.nullable(),
  })
  .meta({ id: 'Workspace' })
export type Workspace = z.infer<typeof workspaceSchema>

/** `current`: the one opened last, where the business app starts. */
export const workspaceListSchema = z.object({ items: z.array(workspaceSchema), current: slugSchema.nullable() })

// ── Invites, as the invited person sees them ──

export const inviteCardSchema = z
  .object({
    id: idSchema,
    business: z.object({
      slug: slugSchema,
      name: z.string(),
      category: z.string(),
      address: z.string(),
      city: cityRefSchema,
      photo: photoSchema.nullable(),
    }),
    /** Who sent it: their name on the team. */
    invitedBy: z.string().nullable(),
    level: assignableLevelSchema,
    /**
     * Who answers booking requests there ("Haýyşlara kim jogap berýär?", the booking rules): the owner and
     * administrators, each specialist their own, or both. The card's lines for the level follow it (book B-08).
     */
    requestAnswerers: z.enum(REQUEST_ANSWERERS),
    state: inviteStateSchema,
    sentAt: epochSchema,
    expiresAt: epochSchema,
  })
  .meta({ id: 'InviteCard' })
export type InviteCard = z.infer<typeof inviteCardSchema>

/** Open and expired invites for the signed-in phone, oldest first. */
export const inviteListSchema = z.object({ items: z.array(inviteCardSchema) })

export const inviteTokenParamSchema = z.object({ token: z.string().min(20).max(100) })

// ── The team, as the owner and administrators see it ──

export const teamMemberSchema = z
  .object({
    id: idSchema,
    name: z.string(),
    fullName: z.string().nullable(),
    specialization: z.string().nullable(),
    /** Seen only by the owner and administrators, who are the only ones who see the team. */
    phone: phoneSchema.nullable(),
    level: levelSchema,
    status: z.enum(STAFF_STATUSES),
    /** false = without the app ("Programmasyz"). */
    hasApp: z.boolean(),
    bookable: z.boolean(),
    canAnswerOwn: z.boolean(),
    /** Has accepted: the row is linked to an account. */
    joined: z.boolean(),
    invite: z.object({ id: idSchema, state: inviteStateSchema, sentAt: epochSchema, expiresAt: epochSchema }).nullable(),
  })
  .meta({ id: 'TeamMember' })
export type TeamMember = z.infer<typeof teamMemberSchema>

export const teamSchema = z.object({ items: z.array(teamMemberSchema) })

const personFields = {
  /** As clients see it: "Aýna". */
  name: z.string().trim().min(1).max(40),
  fullName: z.string().trim().min(1).max(80).optional(),
  specialization: localizedSchema(60).optional(),
  /** The services they do; any makes them bookable. */
  serviceIds: uniqueIdsSchema.max(200).optional(),
}

/** "Çagyr": a mobile number, because the invite goes by SMS (or shows at that phone's sign-in at the first launch). */
export const inviteInputSchema = z
  .object({ phone: mobileInputSchema, level: assignableLevelSchema, ...personFields })
  .meta({ id: 'InviteInput' })

/** A specialist without the app: any phone, no invite, active at once (book Q-216). */
export const phoneOnlyInputSchema = z.object({ phone: phoneInputSchema, ...personFields }).meta({ id: 'PhoneOnlyInput' })

/** The invite's link, shown to the owner to copy: it opens the invite and never signs anyone in. */
export const inviteSentSchema = z.object({ member: teamMemberSchema, link: z.url() })

export const updateMemberSchema = z
  .object({ level: assignableLevelSchema.optional(), canAnswerOwn: z.boolean().optional() })
  .refine((x) => x.level !== undefined || x.canAnswerOwn !== undefined, 'Change at least one thing')
  .meta({ id: 'UpdateMember' })

// ── Removing someone (B-50) ──

/**
 * "Işgäri öçür". Bookings ahead with them make it 409 `bookings_affected` (each with the colleagues who do its
 * services), removing nothing; it's sent again with the owner's choice: `move` to `to` (the time and the service kept,
 * the client told), `keep` (they come to those, then go), or `cancel` (each client offered 3 other times). A booking
 * `to` can't take, busy then or not doing its services, follows its row in `rows`, else is cancelled with 3 other
 * times (no free colleague, B-Team).
 */
export const removeMemberSchema = z
  .object({
    affected: z.enum(['move', 'keep', 'cancel']).optional(),
    to: idSchema.optional(),
    rows: z
      .array(z.object({ code: bookingCodeSchema, affected: z.enum(['keep', 'cancel']) }))
      .max(500)
      .optional(),
  })
  .strict()
  .refine((x) => x.affected !== 'move' || !!x.to, { path: ['to'], message: 'Required to move' })
  .meta({ id: 'RemoveMember' })

/** What happened to the bookings ahead: moved to a colleague, kept, cancelled with offered times. */
export const staffBookingsResultSchema = z
  .object({ moved: z.number().int(), kept: z.number().int(), cancelled: z.number().int() })
  .meta({ id: 'StaffBookingsResult' })

// ── A team member's schedule (B-47) ──

/** Breaks go in 5-minute steps (Aýna: Wednesday 14:00–14:40); the shift in the hours' steps. */
const breakMinute = minuteSchema.refine((m) => m % 5 === 0, 'Every 5 minutes')

/** A personal day off: "Rugsat, doglan gün we ş.m. Diňe biznesiň içinde görünýär." */
export const dayOffSchema = z.object({ name: z.string().trim().min(1).max(40), from: ymdSchema, to: ymdSchema, yearly: z.boolean() })

/**
 * "Iş wagty" in the staff drawer: `shift` null works the business hours ("Biznes açyk wagty işleýär"), else own hours
 * per weekday, Monday first (null = off that weekday), which never open time the business is closed; one break per
 * weekday, which may differ; personal days off.
 */
export const staffScheduleSchema = z
  .object({
    shift: z
      .array(z.object({ open: hoursMinuteSchema, close: hoursMinuteSchema }).nullable())
      .length(7)
      .nullable(),
    breaks: z.array(z.object({ start: breakMinute, end: breakMinute }).nullable()).length(7),
    daysOff: z.array(dayOffSchema).max(50),
  })
  .meta({ id: 'StaffSchedule' })
export type StaffScheduleView = z.infer<typeof staffScheduleSchema>

/**
 * The schedule, saved at once (owner). Bookings ahead it leaves outside their day make it 409 `bookings_affected`,
 * saving nothing; it's sent again with `move` (each to a free colleague who does its services, else 3 other times
 * offered to the client) or `keep` (they stay; nothing new is booked then). New bookings follow the new schedule
 * either way (book Q-211).
 */
export const staffScheduleUpdateSchema = staffScheduleSchema
  .extend({ affected: z.enum(['move', 'keep']).optional() })
  .strict()
  .meta({ id: 'StaffScheduleUpdate' })

export const staffScheduleResultSchema = staffScheduleSchema.extend(staffBookingsResultSchema.shape).meta({ id: 'StaffScheduleResult' })

export const staffIdParamSchema = z.object({ slug: slugSchema, staffId: idSchema })
export const workspaceParamSchema = z.object({ slug: slugSchema })
export const inviteIdParamSchema = z.object({ id: idSchema })
