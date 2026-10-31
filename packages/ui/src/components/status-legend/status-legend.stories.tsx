/**
 * Overlays/StatusLegend (DS-Patterns → Status «StatusLegend»; B-Calendar `legend`, B-Mobile frame 8): «Colours and
 * symbols» behind a ghost circle-help trigger — a popover 320 from 768, a bottom sheet under it — with sections of
 * badges, sources, layer tiles, timers and internal statuses, all from props, and «Got it». Stories are the
 * component's tests: open and close by pointer and keyboard, the first visit, the phone sheet, Russian-length words.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Check, CheckCheck, Clock, Coffee, Globe, Lock, Phone, Play, TriangleAlert, User, UserCheck, UserX, X } from 'lucide-react'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import { StatusBadge } from '../status-badge'
import { Switch } from '../switch'
import { TimerPill } from '../timer-pill'
import { LegendTile, StatusLegend, type StatusLegendSection } from './status-legend'

const NOW = Date.UTC(2026, 9, 21, 10, 0)
const timer = { now: NOW, format: (m: number) => `${m} min`, label: (m: number) => `${m} min left to answer` }

/** A team's internal status chip (DS-Business, B2's InternalStatusChip): 18, white, a 12 icon in its colour. */
function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-pill bg-n-0 px-0.75 ring-1 ring-n-900/10 [&>svg]:size-3"
      style={{ color }}
    >
      {children}
    </span>
  )
}

const statuses: StatusLegendSection = {
  title: 'Statuses',
  variant: 'statuses',
  items: [
    {
      visual: (
        <StatusBadge status="pending" icon={<Clock aria-hidden />}>
          Pending
        </StatusBadge>
      ),
      text: 'New request — waiting for an answer',
    },
    {
      visual: (
        <StatusBadge status="confirmed" icon={<Check aria-hidden />}>
          Confirmed
        </StatusBadge>
      ),
      text: 'Time set, the client was told',
    },
    {
      visual: (
        <StatusBadge status="completed" icon={<CheckCheck aria-hidden />}>
          Completed
        </StatusBadge>
      ),
      text: 'The visit happened (set by itself after the end time)',
    },
    {
      visual: (
        <StatusBadge status="cancelled" icon={<X aria-hidden />}>
          Cancelled
        </StatusBadge>
      ),
      text: 'The client, the business or the system cancelled',
    },
    {
      visual: (
        <StatusBadge status="noshow" icon={<UserX aria-hidden />}>
          No-show
        </StatusBadge>
      ),
      text: 'The client didn’t come — marked with Report from the visit’s start',
    },
  ],
}

const source = (sheet: boolean): StatusLegendSection => ({
  title: 'Source',
  variant: 'inline',
  items: [
    { visual: <Globe aria-hidden />, text: sheet ? 'Online' : 'Online — the client booked on Ýeral' },
    { visual: <Phone aria-hidden />, text: sheet ? 'Phone' : 'Phone — booked during a call' },
    { visual: <User aria-hidden />, text: 'Walk-in' },
  ],
})

const calendar = (sheet: boolean): StatusLegendSection => ({
  title: 'In the calendar',
  items: [
    {
      visual: (
        <LegendTile look="solid">
          <Coffee />
        </LegendTile>
      ),
      text: 'Break',
    },
    {
      visual: (
        <LegendTile look="solid">
          <Lock />
        </LegendTile>
      ),
      text: sheet ? 'Closed' : 'Closed time — with the reason',
    },
    { visual: <LegendTile look="hatch" />, text: 'Buffer' },
    { visual: <LegendTile look="outline" />, text: 'Outside hours' },
    {
      visual: <LegendTile look="outline" />,
      text: 'Busy elsewhere — the time is taken in another workspace; no details are shown',
      wide: true,
    },
    {
      visual: (
        <LegendTile look="pending">
          <Clock />
        </LegendTile>
      ),
      text: 'New time? — the client asked to change the time; the booking stays where it is',
      wide: true,
    },
    { visual: <TriangleAlert aria-hidden className="text-st-pending-ink" />, text: sheet ? 'Alert note' : 'Alert note about the client' },
    {
      visual: <TimerPill size="s" until={NOW + 18 * 60_000} {...timer} />,
      text: 'Time left to answer — counts only while you’re open',
      wide: true,
    },
    {
      visual: <TimerPill size="s" until={NOW} {...timer} by={{ text: 'By 09:30', label: 'Answer by 09:30 tomorrow' }} />,
      text: 'Arrived while you were closed — answer by this time',
      wide: true,
    },
  ],
})

const internal: StatusLegendSection = {
  title: 'Internal statuses',
  items: [
    {
      visual: (
        <Chip color="var(--color-st-completed-ink)">
          <UserCheck aria-hidden />
        </Chip>
      ),
      text: 'Arrived',
    },
    {
      visual: (
        <Chip color="var(--color-a-600)">
          <Play aria-hidden />
        </Chip>
      ),
      text: 'Started',
    },
  ],
  caption: 'Only the team sees these. They don’t change the booking status.',
}

const meta = {
  title: 'Overlays/StatusLegend',
  component: StatusLegend,
  args: {
    title: 'Colours and symbols',
    closeLabel: 'Close',
    confirmLabel: 'Got it',
    sections: [statuses, source(false), calendar(false)],
    onConfirm: fn(),
  },
  decorators: [(Story) => <div className="flex justify-end">{Story()}</div>],
} satisfies Meta<typeof StatusLegend>
export default meta
type Story = StoryObj<typeof meta>

/** The trigger opens the popover (the focus on its title); Esc closes it and the focus comes back. */
export const Popover: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole('button', { name: 'Colours and symbols' })
    await expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Colours and symbols' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    await expect(within(dialog).getByRole('heading', { name: 'Colours and symbols' })).toHaveFocus()
    await expect(within(dialog).getByText('Buffer')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

/** A person's first visit: open by itself; «Got it» closes it and tells the caller to remember. */
export const FirstVisit: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    const dialog = await screen.findByRole('dialog', { name: 'Colours and symbols' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onConfirm).toHaveBeenCalledOnce()
  },
}

/** The close button in the header. */
export const CloseButton: Story = {
  args: { defaultOpen: true },
  play: async ({ args }) => {
    const dialog = await screen.findByRole('dialog', { name: 'Colours and symbols' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onConfirm).not.toHaveBeenCalled()
  },
}

/** With the owner's internal statuses turned on: a fourth section with its caption. */
export const WithInternalStatuses: Story = {
  args: { defaultOpen: true, sections: [statuses, source(false), calendar(false), internal] },
  play: async () => {
    const dialog = await screen.findByRole('dialog', { name: 'Colours and symbols' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(within(dialog).getByText('Arrived')).toBeVisible()
    await expect(within(dialog).getByText('Only the team sees these. They don’t change the booking status.')).toBeVisible()
  },
}

function ShowCancelled() {
  return (
    <>
      <span id="legend-show-cancelled" className="text-button font-medium">
        Show cancelled
      </span>
      <Switch defaultChecked aria-labelledby="legend-show-cancelled" />
    </>
  )
}

/** Under 768 the same sections in a bottom sheet, the sources in one line, the layers in two columns, the «Show cancelled» row, «Got it» full width. */
export const PhoneSheet: Story = {
  globals: { viewport: { value: 'xs' } },
  args: { sections: [statuses, source(true), calendar(true)], extra: <ShowCancelled /> },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Colours and symbols' }))
    const dialog = await screen.findByRole('dialog', { name: 'Colours and symbols' })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(within(dialog).getByRole('switch', { name: 'Show cancelled' })).toBeChecked()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await expect(args.onConfirm).toHaveBeenCalledOnce()
  },
}

/** Russian-length words: the popover's rows wrap, the 126 column holds the badge. */
export const Russian: Story = {
  args: {
    defaultOpen: true,
    title: 'Цвета и обозначения',
    closeLabel: 'Закрыть',
    confirmLabel: 'Понятно',
    sections: [
      {
        title: 'Статусы',
        variant: 'statuses',
        items: [
          {
            visual: (
              <StatusBadge status="pending" icon={<Clock aria-hidden />}>
                Ожидает
              </StatusBadge>
            ),
            text: 'Новый запрос — ждёт ответа',
          },
          {
            visual: (
              <StatusBadge status="confirmed" icon={<Check aria-hidden />}>
                Подтверждено
              </StatusBadge>
            ),
            text: 'Время назначено, клиенту сообщили',
          },
          {
            visual: (
              <StatusBadge status="noshow" icon={<UserX aria-hidden />}>
                Не пришёл
              </StatusBadge>
            ),
            text: 'Клиент не пришёл — отмечается через «Пожаловаться» с начала визита',
          },
        ],
      },
      {
        title: 'В календаре',
        items: [
          { visual: <LegendTile look="hatch" />, text: 'Буфер между записями' },
          {
            visual: <LegendTile look="outline" />,
            text: 'Занят в другом месте — время занято в другом рабочем пространстве; подробности не показываются',
            wide: true,
          },
          {
            visual: (
              <TimerPill
                size="s"
                until={NOW + 18 * 60_000}
                now={NOW}
                format={(m) => `${m} мин`}
                label={(m) => `Осталось ${m} мин на ответ`}
              />
            ),
            text: 'Осталось времени на ответ — идёт только пока вы открыты',
            wide: true,
          },
        ],
      },
    ],
  },
}
