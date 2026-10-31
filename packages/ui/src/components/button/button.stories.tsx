/**
 * Buttons — DS-Components → «Buttons. One gradient primary per view».
 * Primary moves the booking forward; secondary for everything else that matters; ghost for low-stakes actions;
 * tint for toggles that stay on; danger for cancelling (always confirmed in a modal); danger-solid only for that
 * final confirm; ink for the header search button and store buttons.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Heart, MapPin, Search, Share2 } from 'lucide-react'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from './button'

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Ýazylmak', variant: 'primary', size: 'm', onClick: fn() },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: [
        'primary',
        'secondary',
        'ghost',
        'tint',
        'danger',
        'danger-ghost',
        'danger-solid',
        'ink',
        'inverse-solid',
        'inverse-outline',
        'inverse-ghost',
      ],
    },
    size: { control: 'inline-radio', options: ['s', 'm', 'l'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Ýazylmak
      </Button>
      <Button {...args} variant="secondary">
        <MapPin />
        Kartada görkez
      </Button>
      <Button {...args} variant="ghost">
        Soňrak
      </Button>
      <Button {...args} variant="tint">
        <Heart />
        Halanlarym
      </Button>
      <Button {...args} variant="danger">
        Ýazylyşy ýatyr
      </Button>
      <Button {...args} variant="danger-ghost">
        Leave this business
      </Button>
      <Button {...args} variant="danger-solid">
        Hawa, ýatyr
      </Button>
      <Button {...args} variant="ink" iconOnly aria-label="Gözle" className="rounded-pill">
        <Search />
      </Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="s">
        Ýazylmak
      </Button>
      <Button {...args} size="m">
        Ýazylmak
      </Button>
      <Button {...args} size="l">
        Ýazylmak
      </Button>
    </div>
  ),
}

export const IconOnly: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="secondary" size="s" iconOnly aria-label="Paýlaş">
        <Share2 />
      </Button>
      <Button {...args} variant="secondary" iconOnly aria-label="Paýlaş">
        <Share2 />
      </Button>
      <Button {...args} variant="ghost" iconOnly aria-label="Halanlarym">
        <Heart />
      </Button>
    </div>
  ),
}

/**
 * The on-ink set (DS-Patterns → «On ink · bulk bar, toast, move bar»): inverse-solid for the one main action,
 * inverse-outline beside it, inverse-ghost for the clear ×. Disabled on ink keeps the transparent fill with an n-600
 * line and n-500 text, never the n-100 fill.
 */
export const OnInk: Story = {
  args: { size: 's' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2 rounded-m bg-n-900 p-3">
      <Button {...args} variant="inverse-solid">
        Confirm
      </Button>
      <Button {...args} variant="inverse-outline">
        Decline
      </Button>
      <Button {...args} variant="inverse-outline">
        <Share2 />
        Export CSV
      </Button>
      <Button {...args} variant="inverse-outline" disabled>
        Decline
      </Button>
      <Button {...args} variant="inverse-ghost" iconOnly aria-label="Clear selection">
        <Search />
      </Button>
    </div>
  ),
  play: async ({ canvas }) => {
    const off = canvas.getAllByRole('button', { name: 'Decline' })[1]!
    await expect(off).toBeDisabled()
    const style = getComputedStyle(off)
    await expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
    await expect(style.borderColor).toBe('rgb(90, 90, 100)')
    await expect(style.color).toBe('rgb(110, 110, 120)')
  },
}

/** DS-Components `.b:disabled`: every variant greys out the same way, the primary's gradient included. */
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {(['primary', 'secondary', 'ghost', 'tint', 'danger', 'danger-ghost', 'danger-solid', 'ink'] as const).map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(8)
    for (const button of canvas.getAllByRole('button')) {
      await expect(button).toBeDisabled()
      const style = getComputedStyle(button)
      await expect(style.backgroundImage).toBe('none')
      await expect(style.backgroundColor).toBe('rgb(240, 240, 243)')
      await expect(style.color).toBe('rgb(110, 110, 120)')
    }
  },
}

export const Loading: Story = {
  args: { loading: true, loadingLabel: 'Ýüklenýär' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Ýüklenýär' })
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
  },
}

/** The sign-in step's busy primary: the spinner with words beside it («Sending…»), clicks ignored. */
export const LoadingWithText: Story = {
  args: { variant: 'primary', loading: true, loadingText: 'Sending…', children: 'Send code' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Sending…' })
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(button).toHaveAttribute('aria-disabled', 'true')
  },
}

export const AsLink: Story = {
  render: (args) => (
    <Button {...args} asChild>
      <a href="#hyzmatlar">Ýazylmak</a>
    </Button>
  ),
}

export const KeyboardFocus: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.tab()
    const button = canvas.getByRole('button', { name: 'Ýazylmak' })
    await expect(button).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

export const RussianLength: Story = {
  name: 'Russian (+30% length)',
  args: { children: 'Отправить запись' },
}
