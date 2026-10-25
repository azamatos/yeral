/**
 * Display/Rating — «★ 4,9 (212)» on cards and headers; five stars in the reviews summary (12 / 14 / 16); the star input
 * of the review modal (five 48 targets, a word).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { Rating, RatingInput, Stars } from './rating'

const meta = { title: 'Display/Rating', component: Rating, args: { value: '4,9', count: 212 } } satisfies Meta<typeof Rating>
export default meta
type Story = StoryObj<typeof meta>

export const Inline: Story = {}
export const WithoutCount: Story = { args: { count: undefined } }
export const FiveStars: Story = { render: () => <Stars rating={4.6} label="Average rating: 4.6 out of 5" /> }

/** The stars at 12, 14 and 16. */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <Stars rating={4.6} size={12} label="4.6 out of 5" />
      <Stars rating={4.6} size={14} label="4.6 out of 5" />
      <Stars rating={4.6} size={16} label="4.6 out of 5" />
    </div>
  ),
}

const WORDS = ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'] as const

function Pick({
  words = WORDS,
  label = 'Rating',
  placeholder = 'Pick the stars',
}: {
  words?: readonly [string, string, string, string, string]
  label?: string
  placeholder?: string
}) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <RatingInput
      value={value}
      onValueChange={setValue}
      label={label}
      starLabel={(n) => (n === 1 ? '1 star' : `${n} stars`)}
      words={words}
      placeholder={placeholder}
    />
  )
}

/** The review modal's stars: a radio group, arrow keys move and pick, the pick's word beside them and said. */
export const Input: Story = {
  render: () => <Pick />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvas.getByRole('radiogroup', { name: 'Rating' })
    await expect(within(group).getAllByRole('radio')).toHaveLength(5)
    // before a pick, the placeholder word
    await expect(canvas.getByText('Pick the stars')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: '4 stars' }))
    await expect(canvas.getByRole('radio', { name: '4 stars' })).toBeChecked()
    await expect(canvasElement.querySelector('[aria-live]')).toHaveTextContent('Very good')
    // an arrow key moves the focus and picks there (held as a hand holds it: the radio group picks on the focus that
    // follows the key, before it's let go)
    await userEvent.keyboard('{ArrowRight>}')
    await waitFor(() => expect(canvas.getByRole('radio', { name: '5 stars' })).toBeChecked())
    await userEvent.keyboard('{/ArrowRight}')
    await expect(canvasElement.querySelector('[aria-live]')).toHaveTextContent('Excellent')
    // past the last star the pick stays at 5, never wrapping round to 1
    await userEvent.keyboard('{ArrowRight>}')
    await userEvent.keyboard('{/ArrowRight}')
    await expect(canvas.getByRole('radio', { name: '5 stars' })).toBeChecked()
    await expect(canvas.getByRole('radio', { name: '5 stars' })).toHaveFocus()
  },
}

/** Russian-length words. */
export const Russian: Story = {
  render: () => (
    <Pick label="Оценка" words={['Плохо', 'Так себе', 'Хорошо', 'Очень хорошо', 'Превосходно']} placeholder="Выберите звёзды" />
  ),
}
