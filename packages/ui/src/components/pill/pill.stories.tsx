/**
 * Status/Pill (DS-Patterns → Status «Pill · tones × sizes»): eight tones in three sizes, with or without an icon (12,
 * 14 on l). Tags in lists, cards and drawers; not booking statuses (StatusBadge), not buttons (Chip).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarClock, Crown, Star } from 'lucide-react'
import { expect, within } from 'storybook/test'
import { Pill } from './pill'

const meta = { title: 'Status/Pill', component: Pill, args: { children: 'Regular' } } satisfies Meta<typeof Pill>
export default meta
type Story = StoryObj<typeof meta>

const TONES = [
  ['neutral', 'Every year'],
  ['slate', 'Closed'],
  ['accent', 'Current'],
  ['success', 'New'],
  ['warning', 'Phone only'],
  ['danger', 'Reported'],
  ['outline', 'VIP'],
  ['ink', 'Cover'],
] as const

/** Every tone in every size; the ink tone sits on a photo. */
export const TonesAndSizes: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(4,max-content)] items-center gap-3">
      {TONES.map(([tone, text]) => (
        <div key={tone} className="contents">
          {(['s', 'm', 'l'] as const).map((size) => (
            <span key={size} className={tone === 'ink' ? 'rounded-s bg-n-500 p-2' : 'p-2'}>
              <Pill tone={tone} size={size}>
                {text}
              </Pill>
            </span>
          ))}
          <span className={tone === 'ink' ? 'rounded-s bg-n-500 p-2' : 'p-2'}>
            <Pill tone={tone} size="l" icon={<Star aria-hidden />}>
              {text}
            </Pill>
          </span>
        </div>
      ))}
    </div>
  ),
}

/** An icon before the text: 12 on s and m, 14 on l. */
export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Pill tone="neutral" size="s" icon={<CalendarClock aria-hidden />}>
        Every year
      </Pill>
      <Pill tone="neutral" icon={<CalendarClock aria-hidden />}>
        Every year
      </Pill>
      <Pill tone="accent" size="l" icon={<Crown aria-hidden />}>
        VIP
      </Pill>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const pills = within(canvasElement).getAllByText(/Every year|VIP/)
    // the text reads as it is; the icon says nothing
    await expect(pills[0]).toHaveTextContent('Every year')
    await expect(canvasElement.querySelectorAll('svg[aria-hidden]')).toHaveLength(3)
  },
}

/** Russian-length words (about 30% longer): the pill grows, never wraps. */
export const Russian: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Pill tone="neutral">Каждый год</Pill>
      <Pill tone="slate">Закрыто</Pill>
      <Pill tone="success">Новый клиент</Pill>
      <Pill tone="warning" size="l">
        Только по телефону
      </Pill>
      <Pill tone="danger" size="s">
        Есть жалоба
      </Pill>
    </div>
  ),
}
