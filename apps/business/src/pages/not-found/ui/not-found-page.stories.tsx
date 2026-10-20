/** An address the business app doesn't know (every route's `notFoundComponent`; not drawn: the empty-state pattern). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent, waitFor } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { NotFoundPage } from './not-found-page'

function Start() {
  return <p>start</p>
}

const meta = {
  title: 'Business/Pages/Not found',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/nope': NotFoundPage, '/': Start }, path: '/nope' },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Page not found · Ýeral Business'))
    await userEvent.click(canvas.getByRole('link', { name: 'Go to the start' }))
    await expect(await canvas.findByText('start')).toBeVisible()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
