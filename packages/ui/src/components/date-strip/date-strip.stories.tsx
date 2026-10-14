/** Date strip — booking time step: 14 days, a week per page on desktop, native scroll on phones. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { DateStrip, type StripDay } from './date-strip'

const WD = ['Du', 'Si', 'Ça', 'Pe', 'An', 'Şe', 'Ýe']
// 14 days from Wednesday 14 October 2026 (the design's demo clock); Sundays closed, Friday 16 full
const days: StripDay[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 14 + i))
  const date = d.toISOString().slice(0, 10)
  const wd = (d.getUTCDay() + 6) % 7
  const state = wd === 6 ? 'closed' : date === '2026-10-16' ? 'full' : 'available'
  return {
    date,
    weekday: i === 0 ? 'Şu gün' : i === 1 ? 'Ertir' : WD[wd],
    day: d.getUTCDate(),
    state,
    srText: `oktýabr${state === 'full' ? ', boş wagt ýok' : ''}`,
  }
})

function Demo() {
  const [value, setValue] = useState('2026-10-15')
  return (
    <DateStrip
      aria-label="Sene"
      days={days}
      value={value}
      onValueChange={setValue}
      title="Oktýabr 2026"
      prevLabel="Öňki hepde"
      nextLabel="Indiki hepde"
      className="max-w-180"
    />
  )
}

const meta = { title: 'Pickers/DateStrip', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /17 oktýabr/ }))
    await expect(canvas.getByRole('button', { name: /17 oktýabr/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(canvas.getByRole('button', { name: 'Indiki hepde' }))
    await expect(canvas.getByRole('button', { name: 'Öňki hepde' })).toBeEnabled()
  },
}
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
