/**
 * «Something changed» (C7-Booking D1 `ChangedNotice`, book F-245): the Warning callout at the head of the booking card
 * for a client whose last visit was before a move, new hours or a new phone number. The address needs the tick; the
 * rest only inform; several changes are one notice.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { GLOW, PageStory } from '@/shared/storybook'
import { ChangedNotice, type ChangedSinceLastVisit } from './changed-notice'

const WAS = 'Görogly street 52, 1st floor'

/** The notice in a 400-wide column (the booking card's), Friday's hours 10:00–19:00. */
const notice = (changed: ChangedSinceLastVisit, ticked = false) => ({
  routes: {
    '/$lang': function Notice() {
      const [seen, setSeen] = useState(ticked)
      return (
        <div className="max-w-100 p-6">
          <ChangedNotice
            name={GLOW.name}
            changed={changed}
            address={GLOW.address}
            hours={{ weekday: 4, hours: { open: 600, close: 1140 } }}
            phone="+99312456780"
            seen={seen}
            onSeen={setSeen}
          />
        </div>
      )
    },
  },
})

const meta = {
  title: 'Client/Booking/ChangedNotice',
  component: PageStory,
  args: notice({ address: { was: WAS }, hours: false, phone: false }),
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Moved: the new address in ink, «Was: …» under it; the tick starts empty and takes a click. */
export const Moved: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Glow Studio has moved since your last visit')).toBeVisible()
    await expect(canvas.getByText('Bitarap Türkmenistan avenue 247')).toBeVisible()
    await expect(canvas.getByText(`Was: ${WAS}`)).toBeVisible()
    const tick = canvas.getByRole('checkbox', { name: 'I’ve seen the new address' })
    await expect(tick).not.toBeChecked()
    await userEvent.click(tick)
    await waitFor(() => expect(tick).toBeChecked())
  },
}

export const MovedTicked: Story = {
  args: notice({ address: { was: WAS }, hours: false, phone: false }, true),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('checkbox', { name: 'I’ve seen the new address' })).toBeChecked()
  },
}

/** The old address wasn't kept: only the new one, still with the tick. */
export const MovedWithoutWas: Story = {
  args: notice({ address: { was: null }, hours: false, phone: false }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Bitarap Türkmenistan avenue 247')).toBeVisible()
    await expect(canvas.queryByText(/^Was:/)).toBeNull()
    await expect(canvas.getByRole('checkbox', { name: 'I’ve seen the new address' })).toBeVisible()
  },
}

/** New hours only inform: the booking day's hours, no tick. */
export const Hours: Story = {
  args: notice({ address: null, hours: true, phone: false }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('New hours since your last visit')).toBeVisible()
    await expect(canvas.getByText('Fridays:')).toBeVisible()
    await expect(canvas.getByText('10:00–19:00')).toBeVisible()
    await expect(canvas.queryByRole('checkbox')).toBeNull()
  },
}

/** Moved and new hours: one notice, one tick. */
export const MovedAndHours: Story = {
  args: notice({ address: { was: WAS }, hours: true, phone: false }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Glow Studio has moved and changed its hours')).toBeVisible()
    await expect(canvas.getByText('10:00–19:00')).toBeVisible()
    await expect(canvas.getAllByRole('checkbox')).toHaveLength(1)
  },
}

/** A new phone number only informs. */
export const Phone: Story = {
  args: notice({ address: null, hours: false, phone: true }),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('New phone number since your last visit')).toBeVisible()
    await expect(canvas.getByText('+993 12 45 67 80')).toBeVisible()
    await expect(canvas.queryByRole('checkbox')).toBeNull()
  },
}
