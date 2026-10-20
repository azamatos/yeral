/**
 * Display/Avatar (DS-Patterns · Avatar): initials on tint (people), photo when there is one; sizes 24–64; a square for
 * a business logo or a workspace's letter tile (neutral, one letter: 32 r8, 36 r10, 40 r10); neutral for a disabled
 * team row; AddAvatar, the empty picture with a plus.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { brand } from '../../brand'
import { AddAvatar, Avatar, initials } from './avatar'

const meta = { title: 'Display/Avatar', component: Avatar, args: { name: 'Aýjemal Gurbanowa' } } satisfies Meta<typeof Avatar>
export default meta
type Story = StoryObj<typeof meta>

const SIZES = [24, 28, 32, 36, 40, 44, 48, 56, 64] as const

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3.5">
      {SIZES.map((size) => (
        <Avatar key={size} name="Aýjemal Gurbanowa" size={size} />
      ))}
    </div>
  ),
  play: async () => {
    await expect(initials('Aýjemal Gurbanowa')).toBe('AG')
    await expect(initials('ýazgül')).toBe('Ý')
  },
}

/** Logos are squares: 28 r8 · 36 r10 · 44 r12 · 64 r14. */
export const SquareLogos: Story = {
  render: () => (
    <div className="flex items-end gap-3.5">
      {([28, 36, 44, 64] as const).map((size) => (
        <Avatar key={size} name="Glow Studio" src={brand.icon} size={size} shape="square" />
      ))}
    </div>
  ),
}

/** A workspace without a logo: its first letter on a neutral square (the switcher's 32 / 36 / 40). */
export const LetterTile: Story = {
  render: () => (
    <div className="flex items-end gap-3.5">
      {([32, 36, 40] as const).map((size) => (
        <Avatar key={size} name="Aýnanyň saç studiýasy" size={size} shape="square" tone="neutral" letters={1} />
      ))}
    </div>
  ),
}

export const Neutral: Story = { args: { name: 'Leýli', tone: 'neutral', size: 40 } }

export const Photo: Story = { args: { src: '/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg', size: 56 } }

/** Beside the name (a user block, a row): hidden from screen readers, so the name isn't read twice. */
export const Decorative: Story = {
  render: () => (
    <span className="flex items-center gap-2.5">
      <Avatar decorative name="Maýsa Annaýewa" size={32} />
      <span className="text-small font-semibold">Maýsa Annaýewa</span>
    </span>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('[aria-hidden]')).not.toBeNull()
    await expect(canvasElement).toHaveTextContent(/^Maýsa Annaýewa$/)
  },
}

/** AddAvatar: white, a 1px accent ring and a plus; the button around it is named by the screen. */
export const Add: Story = {
  render: () => (
    <button type="button" aria-label="Add photo" className="rounded-pill border-0 bg-transparent p-0 focus-visible:shadow-focus">
      <AddAvatar />
    </button>
  ),
}
