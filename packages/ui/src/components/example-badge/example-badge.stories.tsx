/**
 * Status/ExampleBadge (DS-Patterns → Status «ExampleBadge», v0.6): «Example» on the first launch's sample businesses,
 * the neutral Pill with a flask: S on search rows and map pins, M on cards (on the photo) and the page header. Never
 * violet, never a status colour, not interactive; the card, row or pin around it adds «, example» to its name.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { Callout } from '../callout'
import { MapPin } from '../map-frame'
import { ExampleBadge, ExampleIcon } from './example-badge'

const meta = { title: 'Status/ExampleBadge', component: ExampleBadge, args: { children: 'Example' } } satisfies Meta<typeof ExampleBadge>
export default meta
type Story = StoryObj<typeof meta>

/** S 20 (rows, pins) and M 24 (cards, the page header). */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <ExampleBadge {...args} size="s" />
      <ExampleBadge {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // the word is its text; the flask says nothing
    await expect(within(canvasElement).getAllByText('Example')).toHaveLength(2)
    await expect(canvasElement.querySelectorAll('svg[aria-hidden]')).toHaveLength(2)
  },
}

/**
 * On a business card's photo, top-left 10. The card is named by its words, the badge after the name in its markup
 * (drawn on the photo) with a hidden comma between: «Glow Studio, Example».
 */
export const OnCard: Story = {
  render: (args) => (
    <a href="#card" className="relative block w-64 overflow-hidden rounded-card border border-n-200">
      <span className="block h-36 bg-n-300" />
      <span className="block p-3 text-body font-semibold">Glow Studio</span>
      <span className="sr-only">, </span>
      <ExampleBadge {...args} className="absolute top-2.5 left-2.5" />
    </a>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAccessibleName(/^Glow Studio\s*,\s*Example$/)
  },
}

/** After the name on a search row (S), named by its words: «Glow Studio, Example. Beauty salon · 850 m». */
export const OnSearchRow: Story = {
  render: (args) => (
    <a href="#row" className="flex w-80 items-center gap-3">
      <span className="size-12 flex-none rounded-s bg-n-300" />
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 text-body font-semibold">
          <span>
            Glow Studio<span className="sr-only">,</span>
          </span>
          <ExampleBadge {...args} size="s" />
          <span className="sr-only">.</span>
        </span>
        <span className="text-dense text-n-600">Beauty salon · 850 m</span>
      </span>
    </a>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link')).toHaveAccessibleName(/^Glow Studio\s*,\s*Example\s*\.\s*Beauty salon · 850 m$/)
  },
}

/** Next to the name on the business page, with the owner's line under the header. */
export const OnPageHeader: Story = {
  render: (args) => (
    <div className="max-w-xl flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="m-0 text-h2">Glow Studio</h1>
        <ExampleBadge {...args} />
      </div>
      <Callout tone="neutral" size="s">
        This isn’t a real business. It’s here so you can try Ýeral: bookings are confirmed at once, and nobody waits for you.
      </Callout>
    </div>
  ),
}

/** On a map pin: the flask before the name, n-600 on the white pin, white on the chosen ink pin. */
export const OnMapPin: Story = {
  render: () => (
    <div className="relative h-24 w-80 rounded-s bg-n-100">
      <MapPin aria-label="Glow Studio, example" className="gap-1 pl-2" style={{ left: 90, bottom: 30 }}>
        <ExampleIcon className="text-n-600" />
        Glow Studio
      </MapPin>
      <MapPin hot aria-label="Aýna Beauty, example" className="gap-1 pl-2" style={{ left: 230, bottom: 30 }}>
        <ExampleIcon />
        Aýna Beauty
      </MapPin>
    </div>
  ),
}

/** Russian-length word. */
export const Russian: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <ExampleBadge size="s">Пример</ExampleBadge>
      <ExampleBadge>Пример</ExampleBadge>
    </div>
  ),
}
