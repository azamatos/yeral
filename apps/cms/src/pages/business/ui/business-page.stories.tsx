import type { AdminBusiness } from '@yeral/contract/admin'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { BUSINESS, json, PageStory, pathOf } from '@/shared/storybook'
import { BusinessPage } from './business-page'

/** One business; a verdict changes it, as the api would. */
const api =
  (start: AdminBusiness, { codeOnScreen = false }: { codeOnScreen?: boolean } = {}) =>
  (): typeof fetch => {
    let business = start
    return (input) => {
      const path = pathOf(input)
      if (path === '/v1/auth/mode') return Promise.resolve(json(200, { codeOnScreen }))
      if (path.endsWith('/verify')) {
        business = { ...business, verification: 'verified', addressChangedAt: null }
        return Promise.resolve(new Response(null, { status: 204 }))
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

export const Moved: Story = {
  args: { server: api({ ...BUSINESS, verification: 'verified', addressChangedAt: Date.UTC(2026, 9, 31, 8) }) },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'The new address is right' }))
    await expect(await canvas.findByText('Live')).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument()
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
