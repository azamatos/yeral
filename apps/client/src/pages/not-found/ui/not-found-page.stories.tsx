/** An unknown address — States tile 09: «404», «Page not found», Home, under the marketing header and footer. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { authApi, PageStory } from '@/shared/storybook'
import { NotFoundPage } from './not-found-page'

const meta = {
  title: 'Client/Pages/NotFound',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang/$': NotFoundPage }, path: '/en/nothing-here', server: authApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/en')
    await waitFor(() => expect(document.title).toBe('Page not found · Ýeral'))
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }
