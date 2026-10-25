/**
 * Setting a business up (book B-02–B-06, Q-200; `/setup…`): the business exists as a draft from the business step on;
 * the wizard saves its step, the settings endpoints fill it in (profile, hours, services, team, rules), and finishing
 * puts it in the switcher and in review. At sign-in an unfinished draft reopens the wizard at its step.
 */
import { CONFIRM_MODES } from '@yeral/domain/model'
import { NAME_MAX } from '@yeral/domain/names'
import { SETUP_STEPS } from '@yeral/domain/setup'
import { z } from 'zod'
import { cityRefSchema, idSchema, mobileInputSchema, pageAddressSchema, photoSchema, slugSchema } from './common'
import { groupInputSchema, serviceInputSchema } from './services'
import { assignableLevelSchema, inviteInputSchema } from './team'

/**
 * Step 2, "Biznes": the name and a category that takes appointments (tables and classes come later, book Q-030), and
 * the page address when the owner wrote one (`taken` when another business has it); without it one is made from the
 * name, with a number when that's taken.
 */
export const setupStartSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(NAME_MAX * 2),
    categoryId: z.string().max(40),
    slug: pageAddressSchema.optional(),
  })
  .strict()
  .meta({ id: 'SetupStart' })

export const setupSchema = z
  .object({
    slug: slugSchema,
    name: z.string(),
    /** Where the wizard reopens; the steps before it are done (the sign-in's "Continue setting up" card, Q-200). */
    step: z.enum(SETUP_STEPS),
    /** What the place is (the business's kind, set from its category's name), as the card says it ("Beauty · setup not finished"). */
    category: z.string(),
    /** The category's id: the wizard's business step picks it again by it, whatever the language of `category`. */
    categoryId: z.string(),
    logo: photoSchema.nullable(),
    /** The address saved (at the address step or in the settings); null while it has none (the draft starts empty). */
    address: z.object({ line: z.string(), city: cityRefSchema }).nullable(),
    /** The step list's summaries (B-Onboarding): the services on the menu («5 services»). */
    services: z.number().int(),
    /** The people on the team besides the owner, invited included: 0 «I work alone», else «2 people». */
    team: z.number().int(),
    /** How bookings are confirmed: «I confirm · 30 min» or «Instant confirmation». */
    rules: z.object({ confirm: z.enum(CONFIRM_MODES), holdMinutes: z.number().int() }).nullable(),
  })
  .meta({ id: 'Setup' })
export type Setup = z.infer<typeof setupSchema>

/** The person's unfinished setup, if any (the login routes there before the no-workspace card). */
export const mySetupSchema = z.object({ setup: setupSchema.nullable() }).meta({ id: 'MySetup' })

export const setupStepInputSchema = z
  .object({ step: z.enum(SETUP_STEPS) })
  .strict()
  .meta({ id: 'SetupStepInput' })

/** The most services the services step makes in one go (a longer menu is set up in Settings). */
export const SETUP_SERVICES_MAX = 100

/** The terms each row of the step has (the menu's own limits: `serviceErrors`). */
const terms = serviceInputSchema.pick({ durationMin: true, priceType: true, priceAmount: true }).shape

/**
 * Step 5, "Hyzmatlar" (B-04, F-098): the draft's whole menu as the step leaves it, made in one go, in this order. A
 * group or service saved before comes by its `id` and keeps what the step doesn't show (a description, its buffer,
 * who does it); anything of the menu not sent goes, so saving again adds nothing twice. A starter of the draft's
 * category keeps its name in every language while the one sent is the same; the owner's own rows ("New services")
 * come with their names as written. A new service is done by everyone on the team who takes bookings (the owner when
 * nobody does), the step's "I work alone" default; Settings → Services changes it.
 */
export const setupServicesSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            /** A group of the draft's menu. */
            id: idSchema.optional(),
            /** A starter group of the draft's category. */
            starter: slugSchema.optional(),
            /** As written: needed for a new group without `starter`. */
            name: groupInputSchema.shape.name.optional(),
            services: z
              .array(
                z
                  .object({
                    /** A service of the draft's menu. */
                    id: idSchema.optional(),
                    /** A starter service of the draft's category. */
                    starter: slugSchema.optional(),
                    /** As written: needed for a new service without `starter`. */
                    name: serviceInputSchema.shape.name.optional(),
                    ...terms,
                  })
                  .strict(),
              )
              .min(1)
              .max(SETUP_SERVICES_MAX),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .refine((m) => m.groups.reduce((n, g) => n + g.services.length, 0) <= SETUP_SERVICES_MAX, {
    path: ['groups'],
    message: `Up to ${SETUP_SERVICES_MAX} services`,
  })
  .meta({ id: 'SetupServices' })
export type SetupServices = z.input<typeof setupServicesSchema>

/** The most people the team step adds in one go (a bigger team is invited in Settings → Team). */
export const SETUP_TEAM_MAX = 30
/**
 * Step 6, "Topar" (B-04): the draft's team besides its owner as the step leaves it, saved in one go; anyone not sent
 * goes, so saving again adds nobody twice, and "I work alone" sends nobody. Everyone gives a mobile number (it's how
 * they sign in, now or later; B-Onboarding). Someone with the app (an administrator always) gets an invite when the
 * setup finishes, seen at sign-in with that number for 7 days; a specialist without it (Q-216) is bookable at once and
 * never signs in. A new specialist does every service of the menu.
 */
export const setupTeamSchema = z
  .object({
    members: z
      .array(
        z
          .object({
            /** As clients see it: "Aýna". */
            name: inviteInputSchema.shape.name,
            phone: mobileInputSchema,
            level: assignableLevelSchema,
            /** false = without the app ("Programmasyz"), a specialist only. */
            hasApp: z.boolean(),
          })
          .strict(),
      )
      .max(SETUP_TEAM_MAX),
  })
  .strict()
  .meta({ id: 'SetupTeam' })
export type SetupTeam = z.input<typeof setupTeamSchema>
