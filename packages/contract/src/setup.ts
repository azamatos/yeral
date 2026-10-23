/**
 * Setting a business up (book B-02–B-06, Q-200; `/setup…`): the business exists as a draft from the business step on;
 * the wizard saves its step, the settings endpoints fill it in (profile, hours, services, team, rules), and finishing
 * puts it in the switcher and in review. At sign-in an unfinished draft reopens the wizard at its step.
 */
import { PRICE_TYPES } from '@yeral/domain/model'
import { NAME_MAX } from '@yeral/domain/names'
import { SETUP_STEPS } from '@yeral/domain/setup'
import { z } from 'zod'
import { cityRefSchema, localizedSchema, photoSchema, slugSchema } from './common'

/** Step 2, "Biznes": the name and a category that takes appointments (tables and classes come later, book Q-030). */
export const setupStartSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(NAME_MAX * 2),
    categoryId: z.string().max(40),
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
  })
  .meta({ id: 'Setup' })
export type Setup = z.infer<typeof setupSchema>

/** The person's unfinished setup, if any (the login routes there before the no-workspace card). */
export const mySetupSchema = z.object({ setup: setupSchema.nullable() }).meta({ id: 'MySetup' })

export const setupStepInputSchema = z
  .object({ step: z.enum(SETUP_STEPS) })
  .strict()
  .meta({ id: 'SetupStepInput' })

/** A starter's id in the draft's category (`GET /v1/categories` → `starterGroups`). */
const starterIdSchema = z.string().max(64)

/**
 * Step 5, "Hyzmatlar" (B-04, F-098): the draft's whole menu as the step leaves it, made in one go. It replaces what the
 * step made before, so saving again (a retry, or back at the step) adds nothing twice. A starter keeps its name in
 * every language unless the owner changed it; the owner's own services ("New services") and a menu saved before come
 * with their names as written. Everyone on the draft's team who takes bookings does every service (Settings changes it).
 */
export const setupServicesSchema = z
  .object({
    groups: z
      .array(
        z
          .object({
            /** A starter group of the draft's category: its name in every language. */
            starter: starterIdSchema.optional(),
            /** As written: needed without `starter`, and it wins over the starter group's. */
            name: localizedSchema(60).optional(),
            services: z
              .array(
                z
                  .object({
                    /** A starter service of the draft's category: its name in every language while unchanged. */
                    starter: starterIdSchema.optional(),
                    /** As written: needed without `starter`; for a starter, the owner's change of its name. */
                    name: localizedSchema(80).optional(),
                    /** 5–240 minutes in 5-minute steps. */
                    durationMin: z.number().int(),
                    priceType: z.enum(PRICE_TYPES),
                    priceAmount: z.number().int(),
                  })
                  .strict(),
              )
              .min(1)
              .max(100),
          })
          .strict(),
      )
      .min(1)
      .max(30),
  })
  .strict()
  .meta({ id: 'SetupServices' })
