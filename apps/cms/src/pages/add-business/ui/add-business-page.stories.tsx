import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { AddBusinessPage } from './add-business-page'

const CATEGORIES = {
  items: [
    { id: 'beauty', icon: 'scissors', name: 'Beauty', hint: 'Hair, nails', bookingTypes: ['appointment'], specialistWord: 'specialist' },
  ],
}

const api =
  (add: () => Response): (() => typeof fetch) =>
  () =>
  (input) => {
    if (pathOf(input) === '/v1/admin/businesses') return Promise.resolve(add())
    return Promise.resolve(json(200, CATEGORIES))
  }

function Detail() {
  return <p>one business</p>
}

const meta = {
  title: 'Admin/Pages/Add a business',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/businesses/new': AddBusinessPage, '/businesses/$id': Detail, '/businesses': Detail },
    path: '/businesses/new',
    server: api(() => json(201, { id: 'b1', slug: 'glow' })),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

const fill = async (canvas: Parameters<NonNullable<Story['play']>>[0]['canvas']) => {
  await userEvent.type(await canvas.findByLabelText('Business name'), 'Glow Studio')
  await userEvent.selectOptions(canvas.getByLabelText('Category'), await canvas.findByRole('option', { name: 'Beauty' }))
  await userEvent.type(canvas.getByLabelText("Owner's name"), 'Aýna')
}

export const Adds: Story = {
  play: async ({ canvas }) => {
    await fill(canvas)
    await userEvent.click(canvas.getByRole('button', { name: 'Add the business' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Type a mobile number.')
    await userEvent.type(canvas.getByLabelText("Owner's mobile"), '65000111')
    await userEvent.click(canvas.getByRole('button', { name: 'Add the business' }))
    await expect(await canvas.findByText('one business')).toBeVisible()
  },
}

/** An account unused for 6 months may be someone else's now: the api says so. */
export const OwnerUnused: Story = {
  args: { server: api(() => json(409, { error: { code: 'owner_account_unused' } })) },
  play: async ({ canvas }) => {
    await fill(canvas)
    await userEvent.type(canvas.getByLabelText("Owner's mobile"), '65000111')
    await userEvent.click(canvas.getByRole('button', { name: 'Add the business' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('may belong to someone else now')
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
