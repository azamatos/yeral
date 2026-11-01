import type { AdminReview } from '@yeral/contract/admin'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, within } from 'storybook/test'
import { json, PageStory, pathOf } from '@/shared/storybook'
import { ReviewsPage } from './reviews-page'

const REVIEW: AdminReview = {
  id: '22222222-2222-4222-8222-222222222222',
  business: { id: 'b1', slug: 'glow-studio', name: 'Glow Studio' },
  author: 'Merjen A.',
  rating: 1,
  tags: ['clean'],
  text: 'Nobody was there when I came.',
  what: 'Haircut · Aýna',
  createdAt: Date.UTC(2026, 9, 29, 10),
  reply: null,
  report: {
    reason: 'fake',
    text: 'She never came.',
    at: Date.UTC(2026, 9, 30, 10),
    by: 'Aýna',
    countsAgainAt: Date.UTC(2026, 10, 1, 10),
    counted: false,
  },
  clearedAt: null,
  removed: null,
}

/** The waiting list; a decision takes the review off it, as the api would. */
const api = (start: AdminReview[]) => (): typeof fetch => {
  let items = start
  return (input, init) => {
    if (init?.method === 'POST' && pathOf(input).includes('/admin/reviews/')) {
      items = []
      return Promise.resolve(new Response(null, { status: 204 }))
    }
    return Promise.resolve(json(200, { items }))
  }
}

function Page() {
  return <ReviewsPage />
}

const meta = {
  title: 'Admin/Pages/Reported reviews',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/reviews': Page }, path: '/reviews', server: api([REVIEW]) },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Keeps: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Nobody was there when I came.')).toBeVisible()
    await expect(canvas.getByText("False, or the person didn't come")).toBeVisible()
    await expect(canvas.getByText(/after that it counts in the rating again/)).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Keep it' }))
    await expect(await canvas.findByText('No review is waiting.')).toBeVisible()
  },
}

export const Removes: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Remove' }))
    const dialog = within(await within(canvasElement.ownerDocument.body).findByRole('dialog'))
    await userEvent.type(dialog.getByLabelText('Reason'), 'A made-up visit')
    await userEvent.click(dialog.getByRole('button', { name: 'Remove' }))
    await expect(await canvas.findByText('No review is waiting.')).toBeVisible()
  },
}

/** Past the 48 hours nobody decided in: it counts again until someone does. */
export const PastItsTime: Story = {
  args: { server: api([{ ...REVIEW, report: REVIEW.report && { ...REVIEW.report, counted: true } }]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Past 48 hours/)).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
