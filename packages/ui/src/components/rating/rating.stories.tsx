/** Ratings — «★ 4,9 (212)» on cards and headers; five stars in the reviews summary. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Rating, Stars } from './rating'

const meta = { title: 'Display/Rating', component: Rating, args: { value: '4,9', count: 212 } } satisfies Meta<typeof Rating>
export default meta
type Story = StoryObj<typeof meta>

export const Inline: Story = {}
export const WithoutCount: Story = { args: { count: undefined } }
export const FiveStars: Story = { render: () => <Stars rating={4.6} label="Baha: 5-den 4,6" /> }
