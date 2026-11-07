/**
 * Callout — DS-Lists → 05 Callouts (A10) «Callouts take one tone, icon included» (+ the owner-preview page banner and
 * the phone-only info card from DS-Patterns). Copy is the board's English samples; screens pass theirs through i18n.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, CalendarOff, Clock, Link2, Phone, RotateCw, Users, WifiOff, Zap } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Callout } from './callout'

const meta = {
  title: 'Status/Callout',
  component: Callout,
  args: {
    tone: 'neutral',
    size: 'm',
    title: 'Only your team sees notes',
    children: 'Clients never see notes, tags or reports.',
  },
  argTypes: { icon: { control: false }, actions: { control: false }, action: { control: false }, value: { control: false } },
} satisfies Meta<typeof Callout>
export default meta
type Story = StoryObj<typeof meta>

const inReview = (
  <>
    <b>Your page is in review</b> — only you and your team can see it. After the review it opens in search and at your link. You can use the
    calendar now.
  </>
)

export const Playground: Story = {}

/**
 * Five tones at M: the line, the fill and the icon in one tone, the title ink, the body n-600. Each tone draws its own
 * icon unless the screen names one («Bookings are confirmed at once» = Info + zap). Only danger speaks up by itself
 * (`role="alert"`); the rest are static notes (`role="note"`).
 */
export const Tones: Story = {
  render: () => (
    <div className="grid max-w-180 gap-4">
      <Callout tone="accent" icon={<Zap />} title="Bookings are confirmed at once">
        Your time is set as soon as you book. You’ll find it in My bookings.
      </Callout>
      <Callout
        tone="success"
        title="Your page is live"
        actions={
          <Button size="s">
            <Link2 />
            Copy the link
          </Button>
        }
      >
        Clients can find Glow Studio in search and book at your link.
      </Callout>
      <Callout tone="warning" title="Your page is in review">
        Only you and your team can see it. After the review it opens in search. You can use the calendar now.
      </Callout>
      <Callout tone="danger" title="Ýeral has hidden your page" actions={<Button size="s">Fix the address</Button>}>
        Clients reported the wrong address. Fix it and send the page for review again.
      </Callout>
      <Callout tone="neutral" title="Only your team sees notes">
        Clients never see notes, tags or reports.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Ýeral has hidden your page')
    await expect(canvas.getAllByRole('note')).toHaveLength(4)
    await expect(canvas.queryAllByRole('status')).toHaveLength(0)
    // DS-Lists `.co`: pad 14 16, the icon 20 in the tone's ink on the title's first line
    const live = canvas.getByText('Your page is live').closest('[role]') as HTMLElement
    await expect(getComputedStyle(live).padding).toBe('14px 16px')
    const icon = live.querySelector('[data-callout-icon] svg') as SVGElement
    await expect(getComputedStyle(icon).color).toBe('rgb(6, 106, 65)')
    await expect(icon.getBoundingClientRect().height).toBe(20)
    // the 1 px line, then the 14 padding
    await expect(Math.round(icon.getBoundingClientRect().top - live.getBoundingClientRect().top)).toBe(15)
  },
}

/** Compact: 40 high, icon 16, one line 13/18 500 ink that truncates rather than wraps — the booking summary, a drawer, a 390 step. */
export const Compact: Story = {
  render: () => (
    <div className="grid max-w-120 gap-2">
      <Callout tone="accent" size="compact" icon={<Zap />}>
        Bookings are confirmed at once.
      </Callout>
      <Callout tone="warning" size="compact" icon={<CalendarOff />}>
        Jeren is off on Friday 16 October.
      </Callout>
      <Callout tone="neutral" size="compact">
        Only your team sees this note.
      </Callout>
      <Callout tone="neutral" size="compact" className="max-w-60">
        A note too long for a compact callout is cut with an ellipsis rather than wrapped.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    const box = canvas.getByText('Bookings are confirmed at once.').closest('[role="note"]') as HTMLElement
    await expect(box.getBoundingClientRect().height).toBe(40)
    await expect(getComputedStyle(box).padding).toBe('0px 12px')
    await expect(getComputedStyle(box).borderRadius).toBe('10px')
    await expect((box.querySelector('[data-callout-icon] svg') as SVGElement).getBoundingClientRect().height).toBe(16)
    const long = canvas.getByText(/too long for a compact/)
    await expect(long.scrollWidth).toBeGreaterThan(long.clientWidth)
    await expect(long.getBoundingClientRect().height).toBe(18)
  },
}

/** A title line in 600 ink above the body; `live` callouts (a waiting request, a saved switch) are `role="status"`. */
export const WithTitle: Story = {
  render: () => (
    <div className="grid max-w-120 gap-4">
      <Callout tone="warning" icon={<Clock />} title="18 min left to answer" live>
        If no one answers, the request is cancelled and the client is offered 3 other times.
      </Callout>
      <Callout tone="success" title="Online booking is back" live>
        The no-show count starts again from zero.
      </Callout>
      <Callout
        tone="accent"
        title={<span className="text-label text-a-600 uppercase">Tip</span>}
        actions={
          <a href="#team" className="font-semibold text-a-600 no-underline hover:underline">
            Open Team
          </a>
        }
      >
        If only one specialist is away, add their time off in Team → staff member → Hours.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    const statuses = canvas.getAllByRole('status')
    await expect(statuses).toHaveLength(2)
    await expect(statuses[1]).toHaveTextContent('Online booking is back')
    const title = canvas.getByText('18 min left to answer')
    await expect(getComputedStyle(title).fontWeight).toBe('600')
    await expect(getComputedStyle(title).color).toBe('rgb(16, 16, 20)')
    await expect(getComputedStyle(title.nextElementSibling as HTMLElement).color).toBe('rgb(90, 90, 100)')
  },
}

const onReload = fn()
const onAllow = fn()

/** Secondary S buttons under the body, 8 apart and 8 below it, or one short action on the right of a one-line callout. */
export const WithAction: Story = {
  render: () => (
    <div className="grid max-w-120 gap-4">
      <Callout
        tone="danger"
        icon={<WifiOff />}
        title="Couldn’t load the list"
        actions={
          <Button size="s" onClick={onReload}>
            <RotateCw />
            Reload
          </Button>
        }
      >
        Check your internet connection.
      </Callout>
      <Callout
        tone="accent"
        icon={<Bell />}
        action={
          <Button size="s" onClick={onAllow}>
            Allow
          </Button>
        }
      >
        Turn on notifications to hear new requests.
      </Callout>
      <Callout tone="neutral" icon={<Users />}>
        Work at a business? Ask the owner to send an invite to your phone number — it will appear here.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Check your internet connection.')
    await userEvent.click(canvas.getByRole('button', { name: 'Reload' }))
    await expect(onReload).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }))
    await expect(onAllow).toHaveBeenCalled()
  },
}

/** Full-width warning strip above the page header (owner preview, the business shell while in review). Never dismissed. */
export const PageBanner: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div>
      <Callout layout="banner" tone="warning" icon={<Clock />}>
        {inReview}
      </Callout>
      <div className="flex h-16 items-center border-b border-n-200 px-6 font-bold">Ýeral</div>
      <div className="h-18 bg-n-50" />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent('Your page is in review')
  },
}

/** The calm card that replaces the booking card for a phone-only client: no blame, no warning colour. */
export const InfoCard: Story = {
  render: () => (
    <div className="max-w-90">
      <Callout
        layout="card"
        icon={<Phone />}
        title="You can book this business by phone"
        value="+993 12 34 56 78"
        actions={
          <Button variant="primary" size="l" className="w-full" asChild>
            <a href="tel:+99312345678" aria-label="Call: +993 12 34 56 78">
              <Phone />
              Call
            </a>
          </Button>
        }
      >
        The business asked to arrange your bookings by phone.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'You can book this business by phone' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Call: +993 12 34 56 78' })).toHaveAttribute('href', 'tel:+99312345678')
  },
}

/** At 390: the text wraps beside the icon, actions wrap, the compact line truncates, the card takes the column. */
export const Phone390: Story = {
  name: 'On a phone (390)',
  globals: { viewport: { value: 'xs' } },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div>
      <Callout layout="banner" tone="warning" icon={<Clock />}>
        {inReview}
      </Callout>
      <div className="grid gap-4 p-4">
        <Callout tone="accent" size="compact" icon={<Zap />}>
          Bookings are confirmed at once.
        </Callout>
        <Callout
          tone="danger"
          icon={<WifiOff />}
          title="Couldn’t load the list"
          actions={
            <Button size="s">
              <RotateCw />
              Reload
            </Button>
          }
        >
          Check your internet connection.
        </Callout>
        <Callout tone="accent" icon={<Bell />} action={<Button size="s">Allow</Button>}>
          Turn on notifications to hear new requests.
        </Callout>
        <Callout
          layout="card"
          icon={<Phone />}
          title="You can book this business by phone"
          value="+993 12 34 56 78"
          actions={
            <Button variant="primary" size="l" className="w-full">
              <Phone />
              Call
            </Button>
          }
        >
          The business asked to arrange your bookings by phone.
        </Callout>
      </div>
    </div>
  ),
}

/** Russian runs ~30% longer: titles and text wrap, buttons keep their padding and wrap to the next line. */
export const LongText: Story = {
  name: 'Long text (Russian)',
  render: () => (
    <div className="grid max-w-100 gap-4">
      <Callout tone="warning" icon={<Clock />}>
        <b>Ваша страница на проверке</b> — сейчас её видите только вы и ваша команда. После проверки она откроется в поиске и по вашей
        ссылке. Календарём можно пользоваться уже сейчас.
      </Callout>
      <Callout
        tone="danger"
        icon={<WifiOff />}
        title="Не удалось загрузить список записей"
        actions={
          <>
            <Button size="s">
              <RotateCw />
              Обновить страницу
            </Button>
            <Button size="s" variant="tertiary">
              Написать в поддержку
            </Button>
          </>
        }
      >
        Проверьте подключение к интернету и попробуйте ещё раз.
      </Callout>
      <Callout tone="accent" icon={<Bell />} action={<Button size="s">Разрешить</Button>}>
        Включите уведомления, чтобы сразу узнавать о новых заявках.
      </Callout>
      <Callout tone="accent" size="compact" icon={<Zap />}>
        Запись подтверждается сразу.
      </Callout>
      <Callout
        layout="card"
        icon={<Phone />}
        title="В это заведение можно записаться по телефону"
        value="+993 12 34 56 78"
        actions={
          <Button variant="primary" size="l" className="w-full">
            <Phone />
            Позвонить
          </Button>
        }
      >
        Заведение попросило договариваться о записи по телефону.
      </Callout>
    </div>
  ),
}
