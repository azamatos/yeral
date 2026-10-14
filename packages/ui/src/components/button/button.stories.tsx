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
    variant: { control: 'inline-radio', options: ['primary', 'secondary', 'ghost', 'tint', 'danger', 'danger-solid', 'ink'] },
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

export const Disabled: Story = { args: { disabled: true } }

export const Loading: Story = {
  args: { loading: true, loadingLabel: 'Ýüklenýär' },
  play: async ({ args, canvas }) => {
    const button = canvas.getByRole('button', { name: 'Ýüklenýär' })
    await userEvent.click(button)
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(button).toHaveAttribute('aria-busy', 'true')
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
