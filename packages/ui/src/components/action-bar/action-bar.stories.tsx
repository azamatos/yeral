/**
 * Actions/ActionBar (DS-Patterns → «Phone patterns · sticky action bar»): the phone's sticky bottom bar, a summary and
 * the primary L; the summary opens the whole booking in a sheet when it's expandable.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent, within } from 'storybook/test'
import { Button } from '../button'
import { Price } from '../price'
import { ActionBar } from './action-bar'

const meta = {
  title: 'Actions/ActionBar',
  component: ActionBar,
  globals: { viewport: { value: 'xs' } },
  parameters: { layout: 'fullscreen' },
  args: { action: <Button size="l">Continue</Button> },
  decorators: [
    (Story) => (
      <div className="flex min-h-80 flex-col justify-end bg-n-50">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActionBar>
export default meta
type Story = StoryObj<typeof meta>

/** A caption over the price, «Continue» on the right. */
export const Summary: Story = {
  args: {
    children: (
      <>
        <span className="text-dense text-n-600">2 services · 1 h 45 min</span>
        <Price size="bar">140 TMT</Price>
      </>
    ),
  },
}

/** Only hidden prices: the quieter line. */
export const HiddenPrice: Story = {
  args: {
    children: (
      <>
        <span className="text-dense text-n-600">1 service · 2 h</span>
        <Price hidden size="bar">
          Price at the place
        </Price>
      </>
    ),
  },
}

function Expandable({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <ActionBar
      action={<Button size="l">Continue</Button>}
      expanded={open}
      onExpand={() => {
        setOpen(!open)
        onOpen()
      }}
    >
      <span className="truncate text-body leading-5 font-semibold">Women’s haircut</span>
      <span className="line-clamp-2 text-dense text-n-600">Thu, 15 Oct · 14:30 · 80 TMT</span>
    </ActionBar>
  )
}

/** The summary opens the whole booking in a sheet: a button with a chevron. */
export const ExpandableSummary: Story = {
  args: { onExpand: fn() },
  render: (args) => <Expandable onOpen={args.onExpand!} />,
  play: async ({ args, canvasElement }) => {
    const summary = within(canvasElement).getByRole('button', { name: /Women’s haircut/ })
    await expect(summary).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(summary)
    await expect(args.onExpand).toHaveBeenCalledOnce()
    await expect(summary).toHaveAttribute('aria-expanded', 'true')
  },
}

/** Russian-length words. */
export const Russian: Story = {
  args: {
    action: <Button size="l">Продолжить</Button>,
    children: (
      <>
        <span className="text-dense text-n-600">2 услуги · 1 ч 45 мин</span>
        <Price hidden size="bar">
          Цена уточняется на месте
        </Price>
      </>
    ),
  },
}
