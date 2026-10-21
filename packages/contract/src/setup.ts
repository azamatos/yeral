/**
 * Setting a business up (book B-02–B-06, Q-200; `/setup…`): the business exists as a draft from the business step on;
 * the wizard saves its step, the settings endpoints fill it in (profile, hours, services, team, rules), and finishing
 * puts it in the switcher and in review. At sign-in an unfinished draft reopens the wizard at its step.
 */
import { NAME_MAX } from '@yeral/domain/names'
import { SETUP_STEPS } from '@yeral/domain/setup'
import { z } from 'zod'
import { slugSchema } from './common'

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
    /** Where the wizard reopens. */
    step: z.enum(SETUP_STEPS),
  })
  .meta({ id: 'Setup' })

/** The person's unfinished setup, if any (the login routes there before the no-workspace card). */
export const mySetupSchema = z.object({ setup: setupSchema.nullable() }).meta({ id: 'MySetup' })

export const setupStepInputSchema = z
  .object({ step: z.enum(SETUP_STEPS) })
  .strict()
  .meta({ id: 'SetupStepInput' })
