/**
 * Logging in — Auth (the 400 modal: «1 · Telefon», «2 · SMS kod», «3 · Täze ulanyjy», «4 · Ýalňyş kod», the 60 s lock;
 * a bottom sheet under 768), book C-19 with C-18's steps, the shared SignInCodeStep (DS-Patterns v0.6). Opened from the
 * header's «Log in», as on the site, over a fake api that answers like the real one (contract-shaped bodies and errors;
 * codes 4821, 7305…; 3 wrong ones lock; 5 an hour).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { SiteLayout } from '@/widgets/site-layout'
import { AYJEMAL, authApi, PageStory } from '@/shared/storybook'

function Page() {
  return (
    <SiteLayout>
      <div className="h-60" />
    </SiteLayout>
  )
}

const meta = {
  title: 'Client/Features/LogIn',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': Page }, server: authApi({ people: [AYJEMAL] }) },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']
const body = within(document.body)

/** «Log in» opens the modal with the focus in the number. */
async function open(canvas: Canvas) {
  await userEvent.click(await canvas.findByRole('link', { name: 'Log in' }))
  // the modal's code loads on the first opening
  const dialog = await body.findByRole('dialog', { name: 'Log in to Ýeral' }, { timeout: 5000 })
  await waitFor(() => expect(dialog).toBeVisible())
  return within(dialog)
}

async function sendCode(canvas: Canvas, digits: string) {
  const modal = await open(canvas)
  const phone = modal.getByLabelText('Phone number')
  await waitFor(() => expect(phone).toHaveFocus())
  await userEvent.type(phone, `${digits}{Enter}`)
  await body.findByRole('dialog', { name: 'Enter the code' })
  return modal
}

/** A message the step also reads out (its live region repeats it): the one on screen. */
async function shown(text: string | RegExp, timeout = 1000) {
  const [first] = await body.findAllByText(text, {}, { timeout })
  await expect(first).toBeVisible()
}

/** The number is checked before a code is asked for; Esc closes the modal and the focus goes back to «Log in». */
export const Phone: Story = {
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(modal.getByText('Enter your phone number to manage your bookings.')).toBeVisible()
    const phone = modal.getByLabelText('Phone number')
    await waitFor(() => expect(phone).toHaveFocus())
    await userEvent.type(phone, '651020{Enter}')
    await expect(await modal.findByRole('alert')).toHaveTextContent('The number is incomplete — it needs 8 digits.')
    await userEvent.clear(phone)
    await userEvent.type(phone, '12456789{Enter}')
    await expect(await modal.findByRole('alert')).toHaveTextContent('Codes go to mobile numbers only. Enter a number starting with 6 or 7.')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await expect(canvas.getByRole('link', { name: 'Log in' })).toHaveFocus()
  },
}

/** Someone with an account: the code on screen, a wrong code, the right one; the modal goes and the avatar has the focus. */
export const Returning: Story = {
  play: async ({ canvas }) => {
    const modal = await sendCode(canvas, '65901122')
    await expect(modal.getByText('+993 65 90 11 22')).toBeVisible()
    await expect(modal.getByText('4821')).toBeVisible()
    await waitFor(() => expect(modal.getByLabelText('Code')).toHaveFocus())
    await userEvent.keyboard('1111')
    await shown('Wrong code. 2 tries left.')
    await userEvent.keyboard('4821')
    const avatar = await canvas.findByRole('button', { name: 'Account menu: Aýjemal Gurbanowa' })
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await waitFor(() => expect(avatar).toHaveFocus())
  },
}

/** A new account: the name (first name required, surname optional), then signed in. */
export const NewPerson: Story = {
  name: 'New person',
  play: async ({ canvas }) => {
    await sendCode(canvas, '63774512')
    await userEvent.keyboard('4821')
    const dialog = await body.findByRole('dialog', { name: 'Welcome!' })
    const modal = within(dialog)
    await expect(modal.getByText('What should we call you?')).toBeVisible()
    await expect(modal.getByText('+993 63 77 45 12')).toBeVisible()
    const first = modal.getByLabelText('First name')
    await waitFor(() => expect(first).toHaveFocus())
    // signed in already: the header has the avatar behind the modal
    await expect(canvas.getAllByRole('button', { name: 'Account menu', hidden: true }).length).toBeGreaterThan(0)
    await userEvent.click(modal.getByRole('button', { name: 'Continue' }))
    await expect(await modal.findByRole('alert')).toHaveTextContent('Enter your first name.')
    await userEvent.type(first, 'Gülälek')
    await userEvent.type(modal.getByLabelText('Last name (optional)'), 'Ataýewa')
    await userEvent.click(modal.getByRole('button', { name: 'Continue' }))
    const avatar = await canvas.findByRole('button', { name: 'Account menu: Gülälek Ataýewa' })
    await waitFor(() => expect(avatar).toHaveFocus())
  },
}

/** Change number: back to the phone step with the number kept and focused. */
export const ChangeNumber: Story = {
  name: 'Change number',
  play: async ({ canvas }) => {
    const modal = await sendCode(canvas, '65901122')
    await userEvent.click(modal.getByRole('button', { name: 'Change number' }))
    const phone = await modal.findByLabelText('Phone number')
    await waitFor(() => expect(phone).toHaveFocus())
    await expect(phone).toHaveValue('65 90 11 22')
  },
}

/** Three wrong codes lock the step; when the lock ends the old code is dead and a new one brings the step back. */
export const Locked: Story = {
  args: { server: authApi({ people: [AYJEMAL], lockSec: 2, resendSec: 0 }) },
  play: async ({ canvas }) => {
    const modal = await sendCode(canvas, '65901122')
    await userEvent.keyboard('1111')
    await shown('Wrong code. 2 tries left.')
    await userEvent.keyboard('2222')
    await shown('Wrong code. 1 try left.')
    await userEvent.keyboard('3333')
    await shown(/Too many tries\. Try again in [12] seconds?\./)
    await expect(modal.queryByRole('button', { name: 'Confirm' })).toBeNull()
    await shown('The old code no longer works.', 4000)
    await userEvent.click(modal.getByRole('button', { name: 'Get a new code' }))
    await shown('Here’s a new code.')
    await expect(modal.getByText('7305')).toBeVisible()
    await userEvent.keyboard('{Escape}')
  },
}

/** The sixth code in an hour for one number: the wait in minutes replaces Send code. */
export const TooManyCodes: Story = {
  name: 'Too many codes',
  args: { server: authApi({ codes: 5 }) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await userEvent.type(modal.getByLabelText('Phone number'), '65901122{Enter}')
    await shown('Too many codes. Try again in 42 minutes.')
    await expect(modal.queryByRole('button', { name: 'Send code' })).toBeNull()
    await userEvent.keyboard('{Escape}')
  },
}

/** Without the first-launch code (codes go by SMS): the plain code step, no callout. */
export const CodeNotShown: Story = {
  name: 'Code not on screen',
  args: { server: authApi({ showCode: false }) },
  play: async ({ canvas }) => {
    const modal = await sendCode(canvas, '65901122')
    await expect(modal.queryByText('Your code:')).toBeNull()
    await expect(modal.getByRole('button', { name: /Get a new code in 0:5\d/ })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
  },
}

/** An account unused for 6 months: "Is this you?" before anyone signs in; yes signs in to it. */
export const IsThisYou: Story = {
  name: 'Is this you?',
  args: { server: authApi({ people: [AYJEMAL], unused: [AYJEMAL.phone] }) },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65901122')
    await userEvent.keyboard('4821')
    const dialog = await body.findByRole('dialog', { name: 'Is this you, Aýjemal?' })
    const yes = within(dialog).getByRole('button', { name: 'Yes, it’s me' })
    await waitFor(() => expect(yes).toHaveFocus())
    await userEvent.click(yes)
    await expect(await canvas.findByRole('button', { name: 'Account menu: Aýjemal Gurbanowa' })).toBeVisible()
  },
}

/** "Is this you?" answered no: a fresh account, which asks for the name. */
export const NotMe: Story = {
  name: 'Is this you? · no',
  args: { server: authApi({ people: [AYJEMAL], unused: [AYJEMAL.phone] }) },
  play: async ({ canvas }) => {
    await sendCode(canvas, '65901122')
    await userEvent.keyboard('4821')
    const dialog = await body.findByRole('dialog', { name: 'Is this you, Aýjemal?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'No, start a new account' }))
    await expect(await body.findByRole('dialog', { name: 'Welcome!' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
  },
}

/** No connection: a toast, and the number stays to try again. */
export const Offline: Story = {
  args: { server: () => () => Promise.reject(new TypeError('offline')) },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await userEvent.type(modal.getByLabelText('Phone number'), '65901122{Enter}')
    const toast = await body.findByText('No connection. Please try again.')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(modal.getByLabelText('Phone number')).toHaveValue('65 90 11 22')
    await userEvent.keyboard('{Escape}')
  },
}

/** Phone: a bottom sheet with the same steps. */
export const PhoneSheet: Story = {
  name: 'Phone (bottom sheet)',
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    const modal = await open(canvas)
    await expect(modal.getByLabelText('Phone number')).toBeVisible()
  },
}
