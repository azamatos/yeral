/**
 * Display/Price (DS-Patterns → «Price»): a price as the caller formats it, drawn by its kind and place: a row's slot,
 * a summary card's total, the action bar's total. A hidden price («Price at the place») is quieter and is never given
 * an amount; a total of priced and hidden services is «from» the priced sum (`priceTotal`).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Price } from './price'

const meta = { title: 'Display/Price', component: Price, args: { children: '60 TMT' } } satisfies Meta<typeof Price>
export default meta
type Story = StoryObj<typeof meta>

/** A fixed price in a row's slot: ink 600. */
export const Fixed: Story = {}

/** «from 250 TMT». */
export const From: Story = { args: { children: 'from 250 TMT' } }

/** «Free»: drawn as a price. */
export const Free: Story = { args: { children: 'Free' } }

/** «Price at the place»: n-600 500, no amount. */
export const Hidden: Story = {
  args: { hidden: true, children: 'Price at the place' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('Price at the place')).toHaveClass('text-n-600')
  },
}

/** A summary card: a hidden and a priced service; the total is «from» the priced one. */
export const TotalMixed: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3.5 rounded-card border border-n-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <span className="text-body font-medium">Bridal hair styling</span>
        <Price hidden className="text-right">
          Price at the place
        </Price>
      </div>
      <div className="flex items-start justify-between gap-4">
        <span className="text-body font-medium">Hair styling</span>
        <Price>60 TMT</Price>
      </div>
      <div className="h-px bg-n-200" />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-semibold">Total</span>
        <Price size="total">from 60 TMT</Price>
      </div>
    </div>
  ),
}

/** Only hidden prices: the total says so in a quieter line that wraps. */
export const TotalHiddenOnly: Story = {
  render: () => (
    <div className="flex w-80 items-baseline justify-between gap-4 rounded-card border border-n-200 p-5">
      <span className="text-body font-semibold">Total</span>
      <Price hidden size="total">
        Price at the place
      </Price>
    </div>
  ),
}

/** The phone's action bar: 17/22 700, or the quieter hidden line. */
export const ActionBar: Story = {
  render: () => (
    <div className="flex w-90 flex-col gap-3">
      <div className="flex flex-col">
        <span className="text-dense text-n-600">2 services · 2 h 45 min</span>
        <Price size="bar">from 60 TMT</Price>
      </div>
      <div className="flex flex-col">
        <span className="text-dense text-n-600">1 service · 2 h</span>
        <Price hidden size="bar">
          Price at the place
        </Price>
      </div>
    </div>
  ),
}

/** Russian-length words. */
export const Russian: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Price>от 250 TMT</Price>
      <Price hidden>Цена на месте</Price>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-body font-semibold">Итого</span>
        <Price hidden size="total">
          Цена уточняется на месте
        </Price>
      </div>
    </div>
  ),
}
