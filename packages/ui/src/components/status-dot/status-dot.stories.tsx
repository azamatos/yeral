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

/** «Verified · your page shows in search», «Active». */
export const Success: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <StatusDot tone="success" detail="your page shows in search">
        Verified
      </StatusDot>
      <StatusDot tone="success">Active</StatusDot>
    </div>
  ),
}

/** «Invited · 6 days left»: read as one line, the dot and the «·» as decoration; a detail of 0 still shows. */
export const Warning: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-2">
      <StatusDot tone="warning" detail="6 days left">
        Invited
      </StatusDot>
      <StatusDot tone="warning" detail={0}>
        Days left
      </StatusDot>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText('Invited').closest('span')).toHaveTextContent('Invited· 6 days left')
    await expect(canvas.getByText('Days left').closest('span')).toHaveTextContent('Days left· 0')
    await expect(canvasElement.querySelectorAll('[aria-hidden]')).toHaveLength(4)
  },
}

/** «Turned off» in slate. */
export const Neutral: Story = { args: { tone: 'neutral', children: 'Turned off' } }

/** «Closed today · Opens tomorrow at 09:00» in n-500. */
export const Muted: Story = { args: { tone: 'muted', children: 'Closed today', detail: 'Opens tomorrow at 09:00' } }

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
