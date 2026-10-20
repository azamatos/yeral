/**
 * Callout — DS-Patterns → 02 Feedback → «Callout · tones, sizes, actions» (+ the owner-preview page banner and the
 * phone-only info card). Copy is the board's English samples; screens pass theirs through i18n.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Bell, CircleCheck, CircleX, Clock, Info, Lightbulb, Phone, RotateCw, Users, WifiOff } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../button'
import { Callout } from './callout'

const meta = {
  title: 'Status/Callout',
  component: Callout,
  args: {
    tone: 'neutral',
    size: 'm',
    icon: <Info />,
    children: 'Online booking is off. Your page stays open, but clients can only book by phone. Existing bookings don’t change.',
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

/** Six tones at M. Only danger speaks up by itself (`role="alert"`); the rest are static notes here. */
export const Tones: Story = {
  render: () => (
    <div className="grid max-w-180 gap-4">
      <Callout tone="neutral" icon={<Info />}>
        Online booking is off. Your page stays open, but clients can only book by phone. Existing bookings don’t change.
      </Callout>
      <Callout tone="accent" icon={<Lightbulb />}>
        If only one specialist is away, add their time off in Team → staff member → Hours.
      </Callout>
      <Callout tone="warning" icon={<Clock />}>
        {inReview}
      </Callout>
      <Callout tone="danger" icon={<WifiOff />} title="Couldn’t load the list">
        Check your internet connection.
      </Callout>
      <Callout tone="success" icon={<CircleCheck />}>
        Online booking is back. The no-show count starts again from zero.
      </Callout>
      <Callout tone="slate" icon={<CircleX />} title="Booking cancelled">
        Reason: the specialist is ill. The client is notified.
      </Callout>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('alert')).toHaveTextContent('Couldn’t load the list')
    await expect(canvas.queryAllByRole('status')).toHaveLength(0)
  },
}

/** M (pad 14 16, icon 20) for pages and settings; S (pad 12 14, icon 18) for drawers, panels and inside forms. */
export const Sizes: Story = {
  render: () => (
    <div className="grid max-w-120 gap-4">
      <Callout tone="warning" size="m" icon={<Clock />} title="18 min left to answer">
        If no one answers, the request is cancelled and the client is offered 3 other times.
      </Callout>
      <Callout tone="warning" size="s" icon={<Clock />} title="18 min left to answer">
        If no one answers, the request is cancelled and the client is offered 3 other times.
      </Callout>
      <Callout tone="neutral" size="s">
        A quiet S note without an icon takes no space for one.
      </Callout>
    </div>
  ),
}

/** A title line in 600 above the text; `live` callouts (a waiting request, a cancelled booking) are `role="status"`. */
export const WithTitle: Story = {
  render: () => (
    <div className="grid max-w-120 gap-4">
      <Callout tone="warning" size="s" icon={<Clock />} title="18 min left to answer" live>
        If no one answers, the request is cancelled and the client is offered 3 other times.
      </Callout>
      <Callout tone="slate" size="s" icon={<CircleX />} title="Booking cancelled" live>
        Reason: the specialist is ill. The client is notified.
      </Callout>
      <Callout
        tone="accent"
        icon={<Lightbulb />}
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
    await expect(statuses[1]).toHaveTextContent('Booking cancelled')
  },
}

const onReload = fn()
const onAllow = fn()

/** S buttons under the text, or one short action on the right of a one-line callout. */
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
        size="s"
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

/** At 390: the text wraps beside the icon, actions wrap, the card takes the column. */
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
        <Callout
          tone="danger"
          size="s"
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
        <Callout tone="accent" size="s" icon={<Bell />} action={<Button size="s">Allow</Button>}>
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
        size="s"
        icon={<WifiOff />}
        title="Не удалось загрузить список записей"
        actions={
          <>
            <Button size="s">
              <RotateCw />
              Обновить страницу
            </Button>
            <Button size="s" variant="ghost">
              Написать в поддержку
            </Button>
          </>
        }
      >
        Проверьте подключение к интернету и попробуйте ещё раз.
      </Callout>
      <Callout tone="accent" size="s" icon={<Bell />} action={<Button size="s">Разрешить</Button>}>
        Включите уведомления, чтобы сразу узнавать о новых заявках.
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
