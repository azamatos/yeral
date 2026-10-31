/**
 * What a request brings on any workspace page — B-Shell «New request: Ejegyz T. · Aýna · today · 15:30» + Open (the
 * toast bottom left, a soft sound; a browser notification when the tab is in the background), DS-Business
 * RequestArrivalToast; book B-16 step 9, S-16, F-123, F-170. The api is a `fetch` in the story whose list grows when
 * «A request arrives» is pressed (the app hears it through the events feed, ADR 0028, which invalidates the list the
 * same way). The browser's sound and notifications are a fake the story reads (`fakeBrowserNotifications`): the real
 * ones can't be driven from a test.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useQueryClient } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import type { BookingRequest } from '@yeral/contract/requests'
import { today } from '@yeral/domain/time'
import { keys } from '@yeral/sdk'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { fakeBrowserNotifications } from '@/shared/lib/browser-notifications'
import { RequestArrivals } from './request-arrivals'

const SLUG = 'glow-studio'
const MINUTE = 60_000

/** A request as the api lists it, for today, `holdIn` minutes before it runs out. */
const request = (code: string, kind: BookingRequest['kind'], over: Partial<BookingRequest> = {}): BookingRequest => {
  const now = Date.now()
  return {
    code,
    kind,
    type: 'appointment',
    date: today(now),
    start: 930,
    end: 975,
    holdUntil: now + 30 * MINUTE,
    warnAt: null,
    sentAt: now,
    items: [{ serviceId: null, service: 'Haircut', staffId: null, staff: 'Aýna', start: 930, end: 975 }],
    price: { type: 'fixed', amount: 250 },
    note: null,
    from: kind === 'move' ? { date: today(now), start: 600, end: 645 } : null,
    fits: kind === 'move' ? true : null,
    client: { id: null, name: 'Ejegyz T.', phone: '+99365123456', visits: 2, noShows: 0, alerts: [] },
    canAnswer: true,
    answeredBy: 'anyone',
    ...over,
  }
}

/** The requests waiting now; «A request arrives» adds the next one. */
let waiting: BookingRequest[] = []
let arriving: BookingRequest[] = []

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

const fakeApi =
  (initial: BookingRequest[], next: BookingRequest[]): (() => typeof fetch) =>
  () => {
    waiting = [...initial]
    arriving = [...next]
    return (input: RequestInfo | URL, init?: RequestInit) => {
      const r = new Request(input, init)
      const route = `${r.method} ${new URL(r.url).pathname.replace(/^\/v1/, '')}`
      if (route === `GET /w/${SLUG}/requests`) return Promise.resolve(json({ items: waiting }))
      return Promise.resolve(json({ error: { code: 'not_found' } }, 404))
    }
  }

/** The page the arrivals sit on: a way to make a request arrive, and what Open put in the address. */
function Page() {
  const queryClient = useQueryClient()
  const search: { request?: string; date?: string } = useSearch({ strict: false })
  return (
    <main className="flex flex-col gap-4 p-8">
      <RequestArrivals slug={SLUG} />
      <button
        type="button"
        className="self-start rounded-m border border-n-300 px-4 py-2 text-small"
        onClick={() => {
          const next = arriving.shift()
          if (next) waiting = [...waiting, next]
          void queryClient.invalidateQueries({ queryKey: keys.requests(SLUG) })
        }}
      >
        A request arrives
      </button>
      <p className="text-small text-n-600">
        Opened: {search.request ? `${search.request}${search.date ? ` on ${search.date}` : ''}` : 'nothing yet'}
      </p>
    </main>
  )
}

type Browser = ReturnType<typeof fakeBrowserNotifications>

function Arrivals({ browser, waiting, arriving }: { browser: Browser; waiting: BookingRequest[]; arriving: BookingRequest[] }) {
  const [server] = useState(() => fakeApi(waiting, arriving))
  return <PageStory routes={{ '/w/$slug/calendar': Page }} path={`/w/${SLUG}/calendar`} server={server} browser={browser} />
}

const meta = {
  title: 'Business/Shell/RequestArrivals',
  component: Arrivals,
  parameters: { layout: 'fullscreen' },
  args: { browser: fakeBrowserNotifications(), waiting: [], arriving: [request('YR-NEW1', 'new')] },
  argTypes: { browser: { control: false }, waiting: { control: false }, arriving: { control: false } },
} satisfies Meta<typeof Arrivals>
export default meta
type Story = StoryObj<typeof meta>
type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas']

const body = () => within(document.body)
const client = (name: string): BookingRequest['client'] => ({ id: null, name, phone: null, visits: 0, noShows: 0, alerts: [] })

/** A request arrives (an earlier story's toasts cleared first: sonner keeps them across mounts). */
async function arrives(canvas: Canvas) {
  toast.dismiss()
  await userEvent.click(canvas.getByRole('button', { name: 'A request arrives' }))
}

/** The toast with these words, once it's on screen (it slides in). */
async function toastSaying(text: string) {
  const el = await body().findByText(text)
  await waitFor(() => expect(el).toBeVisible())
  return el
}

/** In front: a new request is the toast with the soft sound; Open opens it in the calendar's drawer. */
export const NewRequest: Story = {
  name: 'New request · in front',
  args: { browser: fakeBrowserNotifications() },
  play: async ({ canvas, args }) => {
    await arrives(canvas)
    await toastSaying('New request: Ejegyz T. · Aýna · today · 15:30')
    await expect(args.browser.state.sounds).toBe(1)
    await expect(args.browser.state.shown).toEqual([])
    await userEvent.click(body().getByRole('button', { name: 'Open' }))
    await expect(await canvas.findByText('Opened: YR-NEW1')).toBeVisible()
  },
}

/** A client asking to move: «Time change request», without the specialist (the move keeps her). */
export const TimeChange: Story = {
  name: 'Time change · in front',
  args: { browser: fakeBrowserNotifications(), arriving: [request('YR-MOVE1', 'move', { client: client('Ogulgerek M.') })] },
  play: async ({ canvas }) => {
    await arrives(canvas)
    await toastSaying('Time change request: Ogulgerek M. · today · 15:30')
  },
}

/** The ones already waiting when the page opened stay quiet: only the arrival speaks. */
export const AlreadyWaiting: Story = {
  name: 'Already waiting · quiet',
  args: {
    browser: fakeBrowserNotifications(),
    waiting: [request('YR-OLD1', 'new', { client: client('Maral B.') })],
    arriving: [request('YR-NEW2', 'new', { client: client('Gülälek N.') })],
  },
  play: async ({ canvas, args }) => {
    await arrives(canvas)
    await toastSaying('New request: Gülälek N. · Aýna · today · 15:30')
    await expect(body().queryByText(/Maral B\./)).toBeNull()
    await expect(args.browser.state.sounds).toBe(1)
  },
}

/** The tab in the background with the permission given: the browser notification with the sound, no toast. */
export const Background: Story = {
  name: 'New request · background',
  args: {
    browser: fakeBrowserNotifications({ permission: 'granted', hidden: true }),
    arriving: [request('YR-NEW3', 'new', { client: client('Jeren A.') })],
  },
  play: async ({ canvas, args }) => {
    await arrives(canvas)
    await waitFor(() =>
      expect(args.browser.state.shown).toEqual([
        expect.objectContaining({ title: 'New request', body: 'Jeren A. · Aýna · today · 15:30', tag: 'new:YR-NEW3' }),
      ]),
    )
    await expect(args.browser.state.sounds).toBe(1)
    await expect(body().queryByText(/Jeren A\./)).toBeNull()
    // the notification's click: the tab comes to the front and the request opens
    args.browser.state.shown[0]!.onClick?.()
    await expect(await canvas.findByText('Opened: YR-NEW3')).toBeVisible()
  },
}

/** In the background without the permission: the toast waits for the person to come back. */
export const BackgroundNotAllowed: Story = {
  name: 'Background · not allowed',
  args: {
    browser: fakeBrowserNotifications({ permission: 'default', hidden: true }),
    arriving: [request('YR-NEW4', 'new', { client: client('Aýsoltan R.') })],
  },
  play: async ({ canvas, args }) => {
    await arrives(canvas)
    await toastSaying('New request: Aýsoltan R. · Aýna · today · 15:30')
    await expect(args.browser.state.shown).toEqual([])
  },
}

/** Five minutes before a request runs out (`warnAt`): «Request time running out» with the sound, for those who may answer. */
export const RunningOut: Story = {
  name: 'Running out · 5-minute warning',
  args: {
    browser: fakeBrowserNotifications(),
    waiting: [
      request('YR-WARN1', 'new', { warnAt: Date.now() + 400, holdUntil: Date.now() + 5 * MINUTE + 400, client: client('Mähri G.') }),
      // the same moment for a request this person may not answer: nothing
      request('YR-WARN2', 'new', {
        warnAt: Date.now() + 400,
        holdUntil: Date.now() + 5 * MINUTE + 400,
        canAnswer: false,
        client: client('Maral B.'),
      }),
    ],
    arriving: [],
  },
  play: async ({ args }) => {
    toast.dismiss()
    await toastSaying('Request time running out: Mähri G. · Aýna · today · 15:30')
    await expect(body().queryByText(/Maral B\./)).toBeNull()
    await expect(args.browser.state.sounds).toBe(1)
  },
}

/** The warning in the background: the browser notification; its tag keeps it apart from the arrival's. */
export const RunningOutBackground: Story = {
  name: 'Running out · background',
  args: {
    browser: fakeBrowserNotifications({ permission: 'granted', hidden: true }),
    waiting: [request('YR-WARN3', 'new', { warnAt: Date.now() - 1000, holdUntil: Date.now() + 4 * MINUTE })],
    arriving: [],
  },
  play: async ({ args }) => {
    await waitFor(() =>
      expect(args.browser.state.shown).toEqual([expect.objectContaining({ title: 'Request time running out', tag: 'warn:YR-WARN3' })]),
    )
  },
}
