/** The placeholder at `/` until the sign-in and the landing come (P4 slice 1). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { HomePage } from './home-page'

const meta = {
  title: 'Business/Pages/Home',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': HomePage } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1 })).toBeVisible()
    await expect(canvas.getByRole('img', { name: 'Ýeral' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Ýeral Business'))
  },
}
