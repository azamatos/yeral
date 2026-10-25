/**
 * Charts/RatingDistribution (DS-Patterns → «Rating distribution»): how reviews spread over 5 → 1 stars, each row a
 * picture named by its words; with the average above it or bars only.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { RatingDistribution } from './rating-distribution'

const rows = [
  { stars: 5, count: 88, label: '5 stars: 88 reviews' },
  { stars: 4, count: 6, label: '4 stars: 6 reviews' },
  { stars: 3, count: 1, label: '3 stars: 1 review' },
  { stars: 2, count: 1, label: '2 stars: 1 review' },
  { stars: 1, count: 0, label: '1 star: 0 reviews' },
]

const meta = {
  title: 'Charts/RatingDistribution',
  component: RatingDistribution,
  args: { rows },
} satisfies Meta<typeof RatingDistribution>
export default meta
type Story = StoryObj<typeof meta>

/** The score, its stars and the count of reviews above the bars. */
export const WithAverage: Story = {
  args: { average: { score: '4.9', rating: 4.9, label: 'Average rating: 4.9 out of 5', count: '96 reviews' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('img', { name: 'Average rating: 4.9 out of 5' })).toBeVisible()
    await expect(canvas.getByRole('img', { name: '5 stars: 88 reviews' })).toBeVisible()
    await expect(canvas.getAllByRole('img')).toHaveLength(6)
  },
}

/** The bars alone. */
export const BarsOnly: Story = {}

/** The first review: one row full, the rest empty. */
export const First: Story = {
  args: {
    average: { score: '5.0', rating: 5, label: 'Average rating: 5.0 out of 5', count: '1 review' },
    rows: rows.map((r) =>
      r.stars === 5 ? { ...r, count: 1, label: '5 stars: 1 review' } : { ...r, count: 0, label: `${r.stars} stars: 0 reviews` },
    ),
  },
}

/** Russian-length words. */
export const Russian: Story = {
  args: {
    average: { score: '4,9', rating: 4.9, label: 'Средняя оценка: 4,9 из 5', count: '96 отзывов' },
    rows: rows.map((r) => ({ ...r, label: `${r.stars} звёзд: ${r.count} отзывов` })),
  },
}
