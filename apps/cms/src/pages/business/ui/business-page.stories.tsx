import type { AdminBusiness } from '@yeral/contract/admin'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { BUSINESS, json, PageStory, pathOf } from '@/shared/storybook'
import { BusinessPage } from './business-page'

/** What the page sent for a new name's verdict. */
const sent: unknown[] = []

/** One business; a verdict changes it, as the api would. */
const api =
  (start: AdminBusiness, { codeOnScreen = false }: { codeOnScreen?: boolean } = {}) =>
  (): typeof fetch => {
    let business = start
    sent.length = 0
    return async (input, init) => {
      const path = pathOf(input)
      if (path === '/v1/auth/mode') return json(200, { codeOnScreen, delivery: codeOnScreen ? 'screen' : 'sms' })
      if (path.endsWith('/verify')) {
        business = { ...business, verification: 'verified', recheck: null, addressChangedAt: null }
        return new Response(null, { status: 204 })
      }
      if (path.endsWith('/name/approve') || path.endsWith('/name/reject')) {
        const raw = input instanceof Request ? await input.text() : init?.body
        const body = JSON.parse(typeof raw === 'string' ? raw : '{}') as { name: string }
        sent.push(body)
        if (path.endsWith('/approve')) business = { ...business, name: body.name }
        business = { ...business, pendingName: null }
        return new Response(null, { status: 204 })
      }
      if (path.endsWith('/hide')) {
        business = { ...business, hidden: { at: 1, reason: 'A fake page' } }
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      if (path.endsWith('/close')) {
        business = { ...business, closed: { at: 1, reason: 'Asked' } }
        return Promise.resolve(json(200, { cancelled: 2 }))
      }
      return Promise.resolve(json(200, business))
    }
  }

function Page() {
  return <BusinessPage id={BUSINESS.id} />
}
function List() {
  return <p>the list</p>
}

const meta = {
  title: 'Admin/Pages/Business',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': Page, '/businesses': List }, server: api(BUSINESS) },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Waiting: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
    await expect(canvas.getByText('12 services · 3 people')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Verify' }))
    await expect(await canvas.findByText('Live')).toBeVisible()
  },
}

/** The first launch: the button says why it can't. */
export const CodeOnScreen: Story = {
  args: { server: api(BUSINESS, { codeOnScreen: true }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Nothing is verified while the sign-in code shows on the screen.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Verify' })).toBeDisabled()
  },
}

/** A live business moved and has new photos (Q-215, Q-275): the note says what changed; checked, it's simply live. */
export const CheckAgain: Story = {
  args: {
    server: api({
      ...BUSINESS,
      verification: 'verified',
      recheck: { at: Date.UTC(2026, 9, 31, 8), what: ['address', 'photos'] },
      addressChangedAt: Date.UTC(2026, 9, 31, 8),
    }),
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Changed since it was checked: address and photos/)).toBeVisible()
    await expect(canvas.getByText('Check again')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Checked, all fine' }))
    await expect(await canvas.findByText('Live')).toBeVisible()
    await expect(canvas.queryByText(/^Changed since it was checked/)).not.toBeInTheDocument()
    await expect(canvas.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
  },
}

const RENAMED: AdminBusiness = { ...BUSINESS, verification: 'verified', pendingName: { name: 'Glow Beauty', at: Date.UTC(2026, 10, 7, 9) } }

/** A new name waits (Q-275): old → new; approved, it's the business's name. */
export const NewName: Story = {
  args: { server: api(RENAMED) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/A new name waits since .*: “Glow Studio” → “Glow Beauty”/)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Approve the new name' }))
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Glow Beauty' })).toBeVisible()
    await expect(sent).toEqual([{ name: 'Glow Beauty' }])
    await expect(canvas.queryByRole('button', { name: 'Approve the new name' })).not.toBeInTheDocument()
  },
}

/** Turned down with a reason the owner reads; the business keeps its name. */
export const NewNameTurnedDown: Story = {
  args: { server: api(RENAMED) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Turn down the new name' }))
    const body = within(canvasElement.ownerDocument.body)
    const dialog = await body.findByRole('dialog')
    await expect(dialog).toHaveAccessibleDescription(/The business keeps “Glow Studio”\. Its owner reads your reason/)
    await userEvent.type(await body.findByLabelText('Reason'), 'Not a business name')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Turn down the new name' }))
    const told = await body.findByText('“Glow Beauty” is turned down')
    await waitFor(() => expect(told).toBeVisible())
    await expect(sent).toEqual([{ name: 'Glow Beauty', reason: 'Not a business name' }])
    await expect(canvas.getByRole('heading', { level: 1, name: 'Glow Studio' })).toBeVisible()
  },
}

/** A reason is asked for, and the owner reads it as written. */
export const Hiding: Story = {
  args: { server: api({ ...BUSINESS, verification: 'verified' }) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Hide' }))
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.type(await body.findByLabelText('Reason'), 'A fake page')
    await userEvent.click(within(await body.findByRole('dialog')).getByRole('button', { name: 'Hide' }))
    await expect(await canvas.findByText('Hidden: A fake page')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Show again' })).toBeVisible()
  },
}

export const Draft: Story = {
  args: { server: api({ ...BUSINESS, setupStep: 'hours' }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Its owner is still setting it up, so there's nothing to decide yet.")).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
  },
}

export const Closed: Story = {
  args: { server: api({ ...BUSINESS, verification: 'verified', closed: { at: 1, reason: 'The owner asked' } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'Open it again' })).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
