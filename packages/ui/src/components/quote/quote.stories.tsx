/**
 * Display/Quote (DS-Patterns → «Quote block · somebody else's words»): a client's note with a caps label, a review or
 * a business's reply with who said it and when.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Stars } from '../rating'
import { Quote } from './quote'

const meta = {
  title: 'Display/Quote',
  component: Quote,
  args: { label: 'Client note', children: '“My hair is long — only take 5 cm off the ends”' },
} satisfies Meta<typeof Quote>
export default meta
type Story = StoryObj<typeof meta>

/** A client's note: the caps label names whose words they are. */
export const Note: Story = {
  render: (args) => (
    <div className="w-96">
      <Quote {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // the label in the figcaption, the words in the blockquote
    const figure = within(canvasElement).getByRole('figure')
    await expect(figure.querySelector('figcaption')).toHaveTextContent('Client note')
    await expect(figure.querySelector('blockquote')).toHaveTextContent('only take 5 cm off the ends')
  },
}

/** A review: who wrote it, the stars and when, above the words. */
export const WithMeta: Story = {
  args: {
    label: undefined,
    meta: (
      <>
        <span className="font-semibold text-n-900">Gülälek N.</span>
        <Stars rating={5} label="5 out of 5" />
        <span className="text-n-600">2 weeks ago</span>
      </>
    ),
    children: 'Aýna got the colour exactly the way I wanted. They saw me on time, and the salon is clean and calm.',
  },
  render: (args) => (
    <div className="w-96">
      <Quote {...args} />
    </div>
  ),
}

/** A business's reply: the caps label and who answered and when, both in the caption. */
export const Reply: Story = {
  args: {
    label: 'Your reply',
    meta: (
      <>
        <span className="font-semibold text-n-900">Glow Studio</span>
        <span className="text-n-600">yesterday</span>
      </>
    ),
    children: 'Thank you, Gülälek! We’ll be glad to see you again.',
  },
  render: (args) => (
    <div className="w-96">
      <Quote {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('figcaption')).toHaveTextContent('Your replyGlow Studioyesterday')
  },
}

/** Russian-length words. */
export const Russian: Story = {
  args: { label: 'Заметка клиента', children: '«У меня длинные волосы — уберите только 5 см с кончиков, пожалуйста»' },
  render: (args) => (
    <div className="w-80">
      <Quote {...args} />
    </div>
  ),
}
