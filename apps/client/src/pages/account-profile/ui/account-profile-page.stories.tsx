/**
 * `/{lang}/account/profile` — Account-Profile (the profile pane; the account aside), book C-43, C-44, C-46, C-47, under
 * the site's chrome, over a fake api: the name and its save bar, the phone (no «Change» while the sign-in code shows on
 * the screen, `canChangePhone`), the phone change, log out, delete the account.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useLocation } from '@tanstack/react-router'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { AccountLayout } from '@/widgets/account-layout'
import { SiteLayout } from '@/widgets/site-layout'
import { AYJEMAL, authApi, PageStory, person } from '@/shared/storybook'
import { AccountProfilePage } from './account-profile-page'

function Profile() {
  return (
    <SiteLayout>
      <AccountLayout>
        <AccountProfilePage />
      </AccountLayout>
    </SiteLayout>
  )
}

/** Where a log-out or a deleted account went: a stand-in that says the address. */
function Landed() {
  const { pathname } = useLocation()
  return <p>Landed on {pathname}</p>
}

/** Aýjemal once the phone change works (codes by SMS). */
const CAN_CHANGE = { ...AYJEMAL, canChangePhone: true }

const meta = {
  title: 'Client/Pages/AccountProfile',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/$lang/account/profile': Profile, '/$lang': Landed },
    path: '/en/account/profile',
    server: authApi({ people: [AYJEMAL], signedIn: AYJEMAL }),
  },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const body = within(document.body)

async function toast(text: string) {
  const shown = await body.findByText(text)
  await waitFor(() => expect(shown).toBeVisible())
}

/** The first launch: the name, the phone without «Change» (the code shows on the screen), the account. */
export const FirstLaunch: Story = {
  name: 'First launch (no phone change)',
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Profile and settings' })).toBeVisible()
    await expect(canvas.getByLabelText('First name')).toHaveValue('Aýjemal')
    await expect(canvas.getByLabelText('Last name')).toHaveValue('Gurbanowa')
    await expect(canvas.getByLabelText('Phone')).toHaveValue('+993 65 90 11 22')
    await expect(canvas.queryByRole('button', { name: 'Change' })).toBeNull()
    await expect(canvas.queryByText('We’ll send an SMS code to the new number.')).toBeNull()
    // no save bar until something changes; no language or SMS sections at the first launch
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
    await expect(canvas.queryByRole('heading', { name: 'Language' })).toBeNull()
    const aside = canvas.getByRole('complementary', { name: 'My account' })
    await expect(within(aside).getByRole('link', { name: 'Profile and settings' })).toHaveAttribute('aria-current', 'page')
  },
}

/** The name: the save bar while it changed; an empty first name can't be saved; Save → «Changes saved». */
export const EditName: Story = {
  name: 'Edit the name',
  play: async ({ canvas }) => {
    const first = await canvas.findByLabelText('First name')
    await userEvent.clear(first)
    const bar = await canvas.findByRole('region', { name: 'Unsaved changes' })
    await expect(await canvas.findByText('Enter your first name.')).toBeVisible()
    await expect(within(bar).getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.type(first, 'Aýna')
    await userEvent.click(within(bar).getByRole('button', { name: 'Save' }))
    await toast('Changes saved')
    await waitFor(() => expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull())
    // the header knows the new name
    await expect(canvas.getByRole('button', { name: 'Account menu: Aýna Gurbanowa' })).toBeInTheDocument()
  },
}

/** Discard brings the saved name back. */
export const Discard: Story = {
  play: async ({ canvas }) => {
    const last = await canvas.findByLabelText('Last name')
    await userEvent.clear(last)
    const bar = await canvas.findByRole('region', { name: 'Unsaved changes' })
    await userEvent.click(within(bar).getByRole('button', { name: 'Discard' }))
    await expect(last).toHaveValue('Gurbanowa')
    await expect(canvas.queryByRole('region', { name: 'Unsaved changes' })).toBeNull()
  },
}

/** Once codes go by SMS: «Change», a number that has an account refused, then the code; the new number shows. */
export const ChangeNumber: Story = {
  name: 'Change the number',
  args: { server: authApi({ people: [CAN_CHANGE, person('+99364215590', 'Gülnar')], signedIn: CAN_CHANGE }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('We’ll send an SMS code to the new number.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }))
    const number = await canvas.findByLabelText('New phone number')
    await waitFor(() => expect(number).toHaveFocus())
    await userEvent.type(number, '64215590{Enter}')
    await expect(await canvas.findByText('This number belongs to another account.')).toBeVisible()
    await userEvent.clear(number)
    await userEvent.type(number, '61057732{Enter}')
    await expect(await canvas.findByText('+993 61 05 77 32')).toBeVisible()
    // codes for a phone change go by SMS: none on the screen
    await expect(canvas.queryByText('Your code:')).toBeNull()
    await userEvent.keyboard('4821')
    await toast('Your phone number is changed.')
    await waitFor(() => expect(canvas.getByLabelText('Phone')).toHaveValue('+993 61 05 77 32'))
  },
}

/** `me` allowed it but the api refuses (`phone_change_unavailable`): a toast, and «Change» goes. */
export const ChangeRefused: Story = {
  name: 'Change refused by the api',
  args: { server: authApi({ people: [CAN_CHANGE], signedIn: CAN_CHANGE, phoneChangeRefused: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    await userEvent.type(await canvas.findByLabelText('New phone number'), '61057732{Enter}')
    await toast("You can't change your number yet.")
    await waitFor(() => expect(canvas.queryByRole('button', { name: 'Change' })).toBeNull())
    await expect(canvas.queryByLabelText('New phone number')).toBeNull()
  },
}

/** The account's own number isn't a change: said under the field, no code asked for. */
export const SameNumber: Story = {
  name: 'Change to the same number',
  args: { server: authApi({ people: [CAN_CHANGE], signedIn: CAN_CHANGE }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    await userEvent.type(await canvas.findByLabelText('New phone number'), '65901122{Enter}')
    await expect(await canvas.findByText('This is already your number.')).toBeVisible()
    await expect(canvas.queryByLabelText('SMS code')).toBeNull()
  },
}

/** The new number was taken between the code and its check: back to the number, which says so. */
export const TakenAtTheCode: Story = {
  name: 'Number taken at the code',
  args: { server: authApi({ people: [CAN_CHANGE], signedIn: CAN_CHANGE, takenAtVerify: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    await userEvent.type(await canvas.findByLabelText('New phone number'), '61057732{Enter}')
    await canvas.findByLabelText('SMS code')
    await userEvent.keyboard('4821')
    await expect(await canvas.findByText('This number belongs to another account.')).toBeVisible()
    await expect(canvas.getByLabelText('New phone number')).toHaveValue('61 05 77 32')
  },
}

/** Cancel closes the change and «Change» is back. */
export const ChangeCancelled: Story = {
  name: 'Change cancelled',
  args: { server: authApi({ people: [CAN_CHANGE], signedIn: CAN_CHANGE }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Change' }))
    await userEvent.click(await canvas.findByRole('button', { name: 'Cancel' }))
    await expect(await canvas.findByRole('button', { name: 'Change' })).toBeVisible()
  },
}

/** Delete: the modal says what goes; Back keeps everything; «Delete account» signs out and goes Home. */
export const DeleteAccount: Story = {
  name: 'Delete the account',
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete account' }))
    let dialog = await body.findByRole('dialog', { name: 'Delete your account?' })
    await expect(dialog).toHaveAccessibleDescription(/businesses keep their own records of your visits/)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }))
    await waitFor(() => expect(body.queryByRole('dialog')).toBeNull())
    await userEvent.click(canvas.getByRole('button', { name: 'Delete account' }))
    dialog = await body.findByRole('dialog', { name: 'Delete your account?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }))
    await expect(await canvas.findByText('Landed on /en')).toBeVisible()
    await toast('Your account is deleted.')
  },
}

/** An owner of a business can't delete the account: the modal says why, and the delete is off. */
export const DeleteOwner: Story = {
  name: 'Delete refused (owns a business)',
  args: { server: authApi({ people: [AYJEMAL], signedIn: AYJEMAL, ownsBusiness: true }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Delete account' }))
    const dialog = within(await body.findByRole('dialog', { name: 'Delete your account?' }))
    await userEvent.click(dialog.getByRole('button', { name: 'Delete account' }))
    await expect(await dialog.findByText(/You own a business on Ýeral/)).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Delete account' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
  },
}

/** Log out from the account goes Home (not to the login the account would ask for). */
export const LogOut: Story = {
  name: 'Log out',
  play: async ({ canvas }) => {
    const section = await canvas.findByRole('region', { name: 'Account' })
    await userEvent.click(within(section).getByRole('button', { name: 'Log out' }))
    await expect(await canvas.findByText('Landed on /en')).toBeVisible()
  },
}

/** Log out from the header's menu while in the account: the account area sends the visitor Home. */
export const LogOutFromHeader: Story = {
  name: 'Log out from the header',
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: /Account menu/ }))
    await userEvent.click(await body.findByRole('menuitem', { name: 'Log out' }))
    await expect(await canvas.findByText('Landed on /en')).toBeVisible()
  },
}

/** An account without a name yet: empty fields, no error until the name is being changed. */
export const NoNameYet: Story = {
  name: 'No name yet',
  args: { server: authApi({ signedIn: person('+99364215590', null) }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('First name')).toHaveValue('')
    await expect(canvas.queryByRole('alert')).toBeNull()
    await userEvent.type(canvas.getByLabelText('Last name'), 'Öwezowa')
    await expect(await canvas.findByText('Enter your first name.')).toBeVisible()
  },
}

/** Phone: the aside is a row of pills, the sections stack, the save bar's buttons share the width. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText('Last name'), '-Öwez')
    await expect(await canvas.findByRole('region', { name: 'Unsaved changes' })).toBeVisible()
  },
}

/** Long names (Russian runs ~30% longer): they wrap in the aside and the fields. */
export const LongNames: Story = {
  name: 'Long names',
  args: {
    server: authApi({
      signedIn: person('+99365901122', 'Aýjemal-Gülälek', 'Gurbanmuhammedowa-Öwezgeldiýewa'),
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText('Last name')).toHaveValue('Gurbanmuhammedowa-Öwezgeldiýewa')
  },
}
