/**
 * The business team (book chapter 3; ADR 0025): the workspaces a person works in, their invites, and the team the
 * owner manages. Workspace endpoints live under `/v1/w/{slug}`; a hidden part answers 403 `forbidden`, a workspace the
 * person isn't on 404 `not_found`.
 */
import { LEVELS } from '@yeral/domain/permissions'
import { STAFF_STATUSES } from '@yeral/domain/model'
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

/** A workspace's page as its banner says it (B-Shell BusinessStatusBanner). */
export const WORKSPACE_STATUSES = ['live', 'in_review', 'not_approved', 'hidden', 'demo'] as const

export const workspaceSchema = z
  .object({
    slug: slugSchema,
    name: z.string(),
    address: z.string(),
    /** Branches are businesses of their own: the city tells two on the same street name apart (book Q-107). */
    city: cityRefSchema,
    /** The business's logo, the switcher's picture (B-10); null: a letter tile. */
    logo: photoSchema.nullable(),
    level: levelSchema,
    /**
     * The page's state, the shell's banner (B-Shell BusinessStatusBanner, Q-012, Q-274): `live`, `in_review` (only the
     * team sees it), `not_approved` (sent back by the Ýeral team), `hidden` (by the Ýeral team) or `demo` (the shared
     * demo workspace, F-242, never public).
     */
    status: z.enum(WORKSPACE_STATUSES),
    /** The Ýeral team's reason, for `not_approved` and `hidden`, to the owner and administrators (who can act on it); else null. */
    statusReason: z.string().nullable(),
    /** The person's specialization here, as the owner set it (B-12's My workspaces); null: "Not set". */
    specialization: z.string().nullable(),
    /** Reviews waiting for a reply, for those who reply (the owner and administrators); 0 for a specialist. */
    reviewsToAnswer: z.number().int().min(0),
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
      /** The card's picture (B-08); null: a letter tile. */
      logo: photoSchema.nullable(),
    }),
    /** Who sent it: their name on the team. */
    invitedBy: z.string().nullable(),
    level: assignableLevelSchema,
    /**
     * Whether they'll answer booking requests there (book B-08), worked out from the business's rules ("who answers",
     * instant or by hand, specialists without the app) and their own switch; the card's line for the level follows it.
     */
    answersRequests: z.boolean(),
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
    /** The picture clients see beside their name (set by the owner, book B-44). */
    photo: photoSchema.nullable(),
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

/**
 * The staff drawer's changes (owner, B-Team): the profile (the name clients see, the full name the team sees, `null`
 * clears it, the specialization, the phone of someone without the app, as theirs is how they sign in otherwise), the
 * level, the right to answer one's own requests, and `hasApp: false` to stop using the app: an open invite is
 * cancelled and the person stays active without it, their bookings with them. Turning it on is an invite
 * (`POST …/invite`). The owner's own row takes the profile's names only.
 */
export const updateMemberSchema = z
  .object({
    name: personFields.name.optional(),
    fullName: z.string().trim().min(1).max(80).nullable().optional(),
    specialization: localizedSchema(60).nullable().optional(),
    phone: phoneInputSchema.optional(),
    level: assignableLevelSchema.optional(),
    canAnswerOwn: z.boolean().optional(),
    hasApp: z.literal(false).optional(),
  })
  .refine((x) => Object.values(x).some((v) => v !== undefined), 'Change at least one thing')
  .meta({ id: 'UpdateMember' })

/** «Services» in the staff drawer (owner or administrator): everything this person does, replacing the last list. */
export const memberServicesSchema = z.object({ serviceIds: uniqueIdsSchema.max(200) }).meta({ id: 'MemberServices' })

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
 * offered to the client), `keep` (they stay; nothing new is booked then) or `cancel` (each client offered 3 other
 * times: B-Team's «Cancel and offer 3 other times»). New bookings follow the new schedule either way (book Q-211).
 */
export const staffScheduleUpdateSchema = staffScheduleSchema
  .extend({ affected: z.enum(['move', 'keep', 'cancel']).optional() })
  .strict()
  .meta({ id: 'StaffScheduleUpdate' })

export const staffScheduleResultSchema = staffScheduleSchema.extend(staffBookingsResultSchema.shape).meta({ id: 'StaffScheduleResult' })

export const staffIdParamSchema = z.object({ slug: slugSchema, staffId: idSchema })
export const workspaceParamSchema = z.object({ slug: slugSchema })
export const inviteIdParamSchema = z.object({ id: idSchema })
