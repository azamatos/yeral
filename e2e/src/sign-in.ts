import { expect, type Locator, type Page } from '@playwright/test'

/**
 * The phone-code sign-in both apps share (`SignInCodeStep` in @yeral/ui): the number, «Send code», the code the
 * screen shows while `SIGN_IN_CODE_ON_SCREEN` is on («Your code: 1234»), typed into the code field, which checks
 * itself after the 4th digit. A number seen for the first time is asked its name afterwards (`firstName`).
 * `within` is the page, or the dialog the client site opens the sign-in in.
 */
export async function signInWithCode(within: Locator | Page, phone: string, firstName?: string): Promise<void> {
  await within.getByRole('textbox', { name: 'Phone number' }).fill(phone)
  await within.getByRole('button', { name: 'Send code' }).click()
  const shown = within.getByText('Your code:')
  await expect(shown).toBeVisible()
  const code = (await shown.textContent())?.match(/\d{4}/)?.[0]
  expect(code, 'the sign-in code shows on the screen').toBeTruthy()
  await within.getByRole('textbox', { name: 'Code' }).fill(code!)
  if (firstName) {
    await within.getByRole('textbox', { name: 'First name' }).fill(firstName)
    await within.getByRole('button', { name: 'Continue' }).click()
  }
  await expect(within.getByRole('textbox', { name: 'Code' })).toBeHidden()
}
