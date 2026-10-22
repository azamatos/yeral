/**
 * The setup wizard's steps and where `/setup/{step}` lands (design §27.2, B-Onboarding, book B-02–B-06, Q-200): step 1
 * is the phone (the sign-in), then the api's draft steps. Someone signed in has done the phone step. With no draft the
 * wizard is at the business step; with one it may open any step up to the one saved (the furthest the wizard moved on
 * to, unless "Continue later" saved an earlier one), never a later one.
 */
import { SETUP_STEPS, WIZARD_STEPS, type SetupStep, type WizardStep } from '@yeral/domain/setup'

export { WIZARD_STEPS, type WizardStep } from '@yeral/domain/setup'

export function isWizardStep(step: string): step is WizardStep {
  return (WIZARD_STEPS as readonly string[]).includes(step)
}

export const stepIndex = (step: WizardStep): number => WIZARD_STEPS.indexOf(step)

/** The step after this one (the done step has none). */
export function nextStep(step: SetupStep): SetupStep | null {
  return SETUP_STEPS[SETUP_STEPS.indexOf(step) + 1] ?? null
}

/**
 * Where a signed-in person at `/setup/{asked}` should be: `asked` when they may open it, else the step their draft is
 * saved at (the business step without a draft).
 */
export function stepFor(asked: WizardStep, saved: SetupStep | null): SetupStep {
  const furthest = saved ?? 'business'
  if (asked === 'phone') return furthest
  return stepIndex(asked) <= stepIndex(furthest) ? asked : furthest
}
