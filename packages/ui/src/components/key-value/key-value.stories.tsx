/**
 * Data/KeyValueList (DS-Patterns → Data «KeyValueList»): facts as a `dl`: default (140 key column, 110 on phones),
 * compact (value right), facts (three columns with caps labels). Never a blank value.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { KeyValueList } from './key-value'

const booking = [
  { key: 'Service', value: 'Hair colouring' },
  { key: 'Specialist', value: 'Aýna · Stylist' },
  { key: 'Date and time', value: 'Today · 11:30–13:30' },
  { key: 'Price', value: 'from 250 TMT' },
  { key: 'Booking code', value: <span className="tabular-nums">YR-48213</span> },
]

const meta = { title: 'Data/KeyValueList', component: KeyValueList, args: { items: booking } } satisfies Meta<typeof KeyValueList>
export default meta
type Story = StoryObj<typeof meta>

/** A booking's details in a drawer: the key column, a line between rows. */
export const Default: Story = {
  render: (args) => (
    <div className="w-96">
      <KeyValueList {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // a definition list: each key a term, each value its definition
    await expect(canvas.getAllByRole('term')).toHaveLength(5)
    await expect(canvas.getAllByRole('definition')).toHaveLength(5)
  },
}

/** The value on the right; nothing given is a quiet word, never blank. */
export const Compact: Story = {
  args: {
    variant: 'compact',
    items: [
      { key: 'How they found you', value: 'Instagram' },
      { key: 'Birthday', value: 'not given', muted: true },
    ],
  },
  render: (args) => (
    <div className="w-96">
      <KeyValueList {...args} />
    </div>
  ),
}

/** A booking's facts at a glance: three columns, caps labels, one line each. */
export const Facts: Story = {
  args: {
    variant: 'facts',
    items: [
      { key: 'Time', value: '11:30–13:30' },
      { key: 'Duration', value: '2 h' },
      { key: 'Specialist', value: 'Aýna' },
      { key: 'Service', value: 'Hair colouring' },
      { key: 'Price', value: 'from 250 TMT' },
      { key: 'Source', value: 'Online' },
    ],
  },
  render: (args) => (
    <div className="w-120">
      <KeyValueList {...args} />
    </div>
  ),
}

/** The phone: the key column narrows to 110. */
export const Phone: Story = {
  globals: { viewport: { value: 'xs' } },
  render: (args) => <KeyValueList {...args} />,
}

/** Russian-length words. */
export const Russian: Story = {
  args: {
    items: [
      { key: 'Услуга', value: 'Окрашивание волос' },
      { key: 'Специалист', value: 'Айна · Стилист' },
      { key: 'Дата и время', value: 'Сегодня · 11:30–13:30' },
      { key: 'Стоимость', value: 'от 250 TMT' },
      { key: 'День рождения', value: 'не указан', muted: true },
    ],
  },
  render: (args) => (
    <div className="w-96">
      <KeyValueList {...args} />
    </div>
  ),
}
