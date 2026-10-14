/** Month calendar — DS-Components → «Date and time»: Monday first, today ringed, chosen day solid. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { TimeSlots } from '../time-slots'
import { Calendar, monthGrid } from './calendar'

const today = '2026-10-14'

function Demo() {
  const [value, setValue] = useState('2026-10-15')
  const [slot, setSlot] = useState<string>()
  return (
    <div className="grid w-fit grid-cols-[300px_1fr] gap-6 rounded-card border border-n-200 p-5 shadow-raised">
      <Calendar
        month="2026-10"
        today={today}
        value={value}
        onValueChange={setValue}
        isDisabled={(d) => d < today || new Date(`${d}T00:00:00Z`).getUTCDay() === 0}
        monthLabel="Oktýabr 2026"
        weekdays={['Du', 'Si', 'Ça', 'Pe', 'An', 'Şe', 'Ýe']}
        dayLabel={(d) => `${Number(d.slice(8))} oktýabr`}
        prevLabel="Öňki aý"
        nextLabel="Indiki aý"
        onNext={() => {}}
      />
      <div className="flex flex-col gap-3.5 border-l border-n-200 pl-6">
        <span className="text-body font-semibold">Penşenbe, {Number(value.slice(8))} oktýabr</span>
        <TimeSlots
          value={slot}
          onValueChange={setSlot}
          groups={[
            { label: 'Irden', slots: ['10:00', '11:30'].map((t) => ({ value: t, label: t })) },
            { label: 'Günortan', slots: ['14:30', '15:00'].map((t) => ({ value: t, label: t })) },
          ]}
        />
      </div>
    </div>
  )
}

const meta = { title: 'Pickers/Calendar', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const DateAndTime: Story = {
  play: async ({ canvas }) => {
    await expect(monthGrid('2026-10').slice(0, 4)).toEqual([null, null, null, '2026-10-01'])
    const day = canvas.getByRole('button', { name: '15 oktýabr' })
    day.focus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('button', { name: '16 oktýabr' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(canvas.getByRole('button', { name: '16 oktýabr' })).toHaveAttribute('aria-pressed', 'true')
  },
}
