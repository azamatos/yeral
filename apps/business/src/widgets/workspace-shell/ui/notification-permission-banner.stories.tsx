/**
 * The shell's notifications banner — B-Shell «5 · Notifications · ask» and «6 · Notifications · blocked in this
 * browser», DS-Business 07 NotificationPermissionBanner (Ask, Blocked); book F-170. The browser's own permission prompt
 * can't be driven from a story: a fake browser (`fakeBrowserNotifications`, `shared/lib/browser-notifications`) stands
 * in and answers «Allow» the way each story says.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent, waitFor } from 'storybook/test'
import { I18nProvider } from '@/shared/i18n'
import { BrowserNotificationsProvider, fakeBrowserNotifications } from '@/shared/lib/browser-notifications'
import { NotificationPermissionBanner } from './notification-permission-banner'

type Browser = NonNullable<Parameters<typeof fakeBrowserNotifications>[0]>

/** The banner over a fresh fake browser on every mount, in a page's width. */
function Banner({ browser }: { browser: Browser }) {
  const [fake] = useState(() => fakeBrowserNotifications(browser))
  return (
    <BrowserNotificationsProvider value={fake}>
      <div className="mx-auto max-w-[880px] p-6">
        <NotificationPermissionBanner />
      </div>
    </BrowserNotificationsProvider>
  )
}

const meta = {
  title: 'Business/Shell/NotificationPermissionBanner',
  component: Banner,
  decorators: [(Story) => <I18nProvider locale="en">{Story()}</I18nProvider>],
  parameters: { layout: 'fullscreen' },
  args: { browser: {} },
  argTypes: { browser: { control: false } },
} satisfies Meta<typeof Banner>
export default meta
type Story = StoryObj<typeof meta>

const ASK = 'Turn on notifications to hear new requests.'
const BLOCKED = 'Notifications are blocked in this browser. Allow them in the browser’s settings.'

/** Not asked yet: the accent line with Allow. Allow opens the browser's prompt; allowed, the banner goes. */
export const Ask: Story = {
  play: async ({ canvas }) => {
    const banner = canvas.getByText(/notifications/i)
    await expect(banner).toHaveTextContent(ASK)
    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }))
    await waitFor(() => expect(canvas.queryByText(/notifications/i)).toBeNull())
  },
}

/** Allow, and the person blocks them in the browser's prompt: the quiet line takes the banner's place. */
export const AskThenBlocked: Story = {
  name: 'Ask → blocked',
  args: { browser: { answer: 'denied' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Allow' }))
    await expect(await canvas.findByText(BLOCKED)).toBeVisible()
    await expect(canvas.queryByRole('button', { name: 'Allow' })).toBeNull()
  },
}

/** Blocked in this browser: the neutral line with Close, which keeps it closed in this browser. */
export const Blocked: Story = {
  args: { browser: { permission: 'denied' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/notifications/i)).toHaveTextContent(BLOCKED)
    await userEvent.click(canvas.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(canvas.queryByText(/notifications/i)).toBeNull())
  },
}

/** Blocked and closed before: nothing, until the permission changes. */
export const BlockedClosedBefore: Story = {
  name: 'Blocked, closed before',
  args: { browser: { permission: 'denied', blockedClosed: true } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/notifications/i)).toBeNull()
  },
}

/** Allowed: nothing to say. */
export const Allowed: Story = {
  args: { browser: { permission: 'granted' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/notifications/i)).toBeNull()
  },
}

/** A browser without notifications (an iPhone outside an installed app): no banner, nothing to allow. */
export const Unsupported: Story = {
  args: { browser: { permission: 'unsupported' } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/notifications/i)).toBeNull()
  },
}

/** Keyboard: Allow is the one stop; Enter asks. */
export const AskKeyboard: Story = {
  name: 'Ask · keyboard',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Allow' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(canvas.queryByText(/notifications/i)).toBeNull())
  },
}

/** Under 768: the line wraps, Allow stays on the right (B-Mobile). */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** The blocked line at a phone's width: the text wraps around the Close button. */
export const PhoneBlocked: Story = {
  name: 'Phone · blocked',
  args: { browser: { permission: 'denied' } },
  globals: { viewport: { value: 'xs' } },
}
