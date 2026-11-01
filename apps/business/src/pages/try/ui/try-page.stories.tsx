import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { TryPage } from './try-page'

const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const DEMO_ME = { id: 'd1', phone: '+99300000001', firstName: 'Demo', lastName: null, demo: true }

function Calendar() {
  return <p>the demo calendar</p>
}
function Login() {
  return <p>the sign-in</p>
}

const meta = {
  title: 'Business/Pages/Try the business app',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: { '/try': TryPage, '/w/$slug/calendar': Calendar, '/login': Login },
    path: '/try',
    server: () => () => Promise.resolve(answer(200, { me: DEMO_ME, slug: 'demo' })),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Opens: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('the demo calendar')).toBeVisible()
  },
}

/** `DEMO_WORKSPACE` off: the page says so and offers the sign-in. */
export const DemoOff: Story = {
  args: { server: () => () => Promise.resolve(answer(404, { error: { code: 'not_found' } })) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: "The demo isn't open right now" })).toBeVisible()
    await userEvent.click(canvas.getByRole('link', { name: 'Log in' }))
    await expect(await canvas.findByText('the sign-in')).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
