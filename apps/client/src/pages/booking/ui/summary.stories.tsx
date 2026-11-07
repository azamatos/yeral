/**
 * The booking's summary card on its own (C7-Booking C4.4 `BookingSummary`), for the states the flow's stories can't
 * drive through the fake api: the chosen time the new total no longer fits (the amber row, Continue waits).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { expect } from 'storybook/test'
import { GLOW, PageStory } from '@/shared/storybook'
import { selectionTotal } from '../model/selection'
import { Summary } from './summary'

const all = GLOW.serviceGroups.flatMap((g) => g.services)
const picked = all.filter((s) => s.id === 's1' || s.id === 's3')

const meta = {
  title: 'Client/Booking/BookingSummary',
  component: PageStory,
  args: {
    routes: {
      '/$lang': () => (
        <div className="max-w-100 p-6">
          <Summary
            detail={GLOW}
            picked={picked}
            total={selectionTotal(picked)}
            staffName="Aýna"
            date={today()}
            time={null}
            stale={930}
            cta={
              <Button size="l" variant="primary" className="w-full" disabled>
                Continue
              </Button>
            }
            hint="Pick a time that fits 3 h."
            onClear={() => {}}
            onRemove={() => {}}
            onChangeStaff={() => {}}
            onChangeTime={() => {}}
          />
        </div>
      ),
    },
  },
  argTypes: { routes: { control: false }, server: { control: false } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/** Hair colouring added to the haircut: 15:30 no longer fits the 3 h, the time row says so in amber and Continue waits. */
export const TimeNoLongerFits: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Too short for 3 h.')).toBeVisible()
    await expect(canvas.getByText(/· 15:30$/)).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Change the date and time' })).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await expect(canvas.getByText('Pick a time that fits 3 h.')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Remove Hair colouring' })).toBeVisible()
  },
}
