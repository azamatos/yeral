import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { BUSINESS_ITEM, json, PageStory, pathOf } from '@/shared/storybook'
import { BusinessesPage } from './businesses-page'

/** Answers each view with its own businesses, and writes down what it was asked. */
const api = (items: Record<string, unknown[]>) => (): typeof fetch => (input) => {
  const url = new URL(input instanceof Request ? input.url : input.toString())
  if (pathOf(input) === '/v1/admin/businesses')
    return Promise.resolve(json(200, { items: items[url.searchParams.get('view') ?? 'review'] ?? [] }))
  return Promise.resolve(json(404, { error: { code: 'not_found' } }))
}

function Page() {
  return <BusinessesPage />
}
function Hidden() {
  return <BusinessesPage view="hidden" />
}
function Detail() {
  return <p>one business</p>
}

const meta = {
  title: 'Admin/Pages/Businesses',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/businesses': Page, '/businesses/$id': Detail, '/businesses/new': Detail },
    path: '/businesses',
    server: api({ review: [BUSINESS_ITEM, { ...BUSINESS_ITEM, id: '2', slug: 'nur', name: 'Nur Dental', owner: null }] }),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Queue: Story = {
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('link', { name: 'Glow Studio' })
    await expect(row).toBeVisible()
    await expect(canvas.getByText('+993 65 00 01 11')).toBeVisible()
    await expect(canvas.getAllByText('In review').length).toBeGreaterThan(1)
    await userEvent.click(row)
    await expect(await canvas.findByText('one business')).toBeVisible()
  },
}

export const NothingWaiting: Story = {
  args: { server: api({}) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Nothing is waiting for review.')).toBeVisible()
  },
}

export const HiddenView: Story = {
  args: { routes: { '/businesses': Hidden, '/businesses/$id': Detail, '/businesses/new': Detail }, server: api({}) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('No business is hidden.')).toBeVisible()
    await expect(canvas.getByRole('tab', { name: 'Hidden' })).toHaveAttribute('aria-selected', 'true')
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
