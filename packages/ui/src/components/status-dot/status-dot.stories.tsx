/**
 * Status/StatusDot (DS-Patterns → Legend + StatusDot): a state in words with an 8 px dot, success · warning · neutral
 * (slate) · muted, with an optional n-600 detail after «·» (B-Team staff state, B-Settings «Verified», Venue open or
 * closed).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, within } from 'storybook/test'
import { StatusDot } from './status-dot'

const meta = { title: 'Status/StatusDot', component: StatusDot, args: { children: 'Active' } } satisfies Meta<typeof StatusDot>
export default meta
type Story = StoryObj<typeof meta>

/** The board's samples: each tone, with and without a detail. */
export const Tones: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <StatusDot tone="success" detail="your page shows in search">
        Verified
      </StatusDot>
      <StatusDot tone="warning" detail="6 days left">
        Invited
      </StatusDot>
      <StatusDot tone="success">Active</StatusDot>
      <StatusDot tone="neutral">Turned off</StatusDot>
      <StatusDot tone="muted" detail="Opens tomorrow at 09:00">
        Closed today
      </StatusDot>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // read as one line: the label, then the detail; the dot and the «·» are decoration
    await expect(canvas.getByText('Invited').closest('span')).toHaveTextContent('Invited· 6 days left')
    await expect(canvasElement.querySelectorAll('[aria-hidden]').length).toBe(8)
  },
}

/** Russian-length words: the line grows. */
export const Russian: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <StatusDot tone="success" detail="ваша страница видна в поиске">
        Проверено
      </StatusDot>
      <StatusDot tone="warning" detail="осталось 6 дней">
        Приглашение отправлено
      </StatusDot>
      <StatusDot tone="muted" detail="Откроется завтра в 09:00">
        Сегодня закрыто
      </StatusDot>
    </div>
  ),
}
