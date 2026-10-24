/**
 * AvatarStack — DS-Patterns («Who does it» on B-Services, B-Team). Stories are the component's tests: one per variant.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { AvatarStack } from './avatar-stack'

const people = [
  { id: 'aya', name: 'Aýna Myradowa' },
  { id: 'maral', name: 'Maral Saparowa' },
  { id: 'jeren', name: 'Jeren Ataýewa' },
  { id: 'leyli', name: 'Leýli Orazowa' },
  { id: 'gulnar', name: 'Gülnar Hojaýewa' },
]

const meta = {
  title: 'Display/AvatarStack',
  component: AvatarStack,
  args: { people: people.slice(0, 2) },
} satisfies Meta<typeof AvatarStack>
export default meta
type Story = StoryObj<typeof meta>

/** Two faces, the second over the first. */
export const Default: Story = {}

/** One face. */
export const One: Story = { args: { people: people.slice(0, 1) } }

/** More than three: three faces and «+2». */
export const More: Story = {
  args: { people },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toHaveTextContent('+2')
  },
}

/** 32, as on B-Team. */
export const Large: Story = { args: { people, size: 32 } }
