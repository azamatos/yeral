/**
 * Buttons — DS · Controls (v0.7 · A4) «Buttons that look like buttons»: every action has a box at rest.
 * Primary moves the booking forward (one per view); secondary for everything else that matters; tertiary for low
 * priority; tint for toggles that stay on; danger-quiet for a destructive step that still confirms; danger-solid only
 * for that final confirm; ink for the header search button and store buttons; the plain icon button in rows and
 * toolbars. Sizes S 32 / M 40 / L 48 (A3): business toolbars and forms M, client forms and 390 L.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Copy, Heart, MapPin, Plus, Search, Share2 } from 'lucide-react'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { Button } from './button'
import { IconButton } from './icon-button'

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
        'tertiary',
        'tint',
        'danger-quiet',
        'danger-solid',
        'ink',
        'plain',
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

const BOXED = ['primary', 'secondary', 'tertiary', 'tint', 'danger-quiet', 'danger-solid', 'ink'] as const

export const Playground: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        New booking
      </Button>
      <Button {...args} variant="secondary">
        <MapPin />
        Call
      </Button>
      <Button {...args} variant="tertiary">
        Break
      </Button>
      <Button {...args} variant="tint">
        <Heart />
        Saved
      </Button>
      <Button {...args} variant="danger-quiet">
        Turn off
      </Button>
      <Button {...args} variant="danger-solid">
        Delete client
      </Button>
      <Button {...args} variant="ink" iconOnly aria-label="Search" className="rounded-pill">
        <Search />
      </Button>
    </div>
  ),
}

/** S 32 · pad 12 · 13/16 — M 40 · pad 16 · 14/20 — L 48 · pad 20 · 15/20; the icon 16 / 18 / 20, gap 6 / 8 / 8. */
export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {BOXED.slice(0, 5).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          <Button {...args} variant={variant} size="s">
            Book
          </Button>
          <Button {...args} variant={variant} size="m">
            Book
          </Button>
          <Button {...args} variant={variant} size="l">
            Book
          </Button>
          <Button {...args} variant={variant} size="m">
            <Plus />
            New booking
          </Button>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    const [s, m, l] = canvas.getAllByRole('button', { name: 'Book' })
    await expect(s!.getBoundingClientRect().height).toBe(32)
    await expect(m!.getBoundingClientRect().height).toBe(40)
    await expect(l!.getBoundingClientRect().height).toBe(48)
    await expect(getComputedStyle(m!).paddingLeft).toBe('16px')
  },
}

/** `IconButton`: square 32 / 40 / 48, named by `label` (aria-label + tooltip); outline standalone, plain in rows and toolbars. */
export const IconOnly: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton label="Share" size="s">
        <Share2 />
      </IconButton>
      <IconButton label="Share" size="m">
        <Share2 />
      </IconButton>
      <IconButton label="Share" size="l">
        <Share2 />
      </IconButton>
      <IconButton label="Copy number" variant="plain" size="s">
        <Copy />
      </IconButton>
      <IconButton label="Copy number" variant="plain" size="m">
        <Copy />
      </IconButton>
      <IconButton label="Copy number" variant="plain" size="m" disabled>
        <Copy />
      </IconButton>
    </div>
  ),
  play: async ({ canvas }) => {
    const share = canvas.getAllByRole('button', { name: 'Share' })
    await expect(share[1]!.getBoundingClientRect().width).toBe(40)
    await userEvent.hover(share[1]!)
    await waitFor(() => expect(document.body.querySelector('[role="tooltip"]')).toHaveTextContent('Share'))
    const plain = canvas.getAllByRole('button', { name: 'Copy number' })
    await expect(getComputedStyle(plain[0]!).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    await expect(getComputedStyle(plain[2]!).backgroundColor).toBe('rgba(0, 0, 0, 0)')
  },
}

/**
 * The on-ink set (DS-Patterns → «On ink · bulk bar, toast, move bar»): inverse-solid for the one main action,
 * inverse-outline beside it, inverse-ghost for the clear ×. Disabled on ink keeps the transparent fill with an n-600
 * line and n-500 text, never the n-100 fill.
 */
export const OnInk: Story = {
  args: { size: 's' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-2 rounded-ctl-l bg-n-900 p-3">
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

/** Disabled is the same for every boxed variant: n-100 fill, n-400 text, no border, no shadow (the gradient too). */
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {BOXED.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button')).toHaveLength(BOXED.length)
    for (const button of canvas.getAllByRole('button')) {
      await expect(button).toBeDisabled()
      const style = getComputedStyle(button)
      await expect(style.backgroundImage).toBe('none')
      await expect(style.backgroundColor).toBe('rgb(240, 240, 243)')
      await expect(style.color).toBe('rgb(176, 176, 184)')
      await expect(style.borderColor).toBe('rgba(0, 0, 0, 0)')
    }
  },
}

/** A 16 px spinner takes the leading icon's place; the label stays and the width doesn't change; clicks are ignored. */
export const Loading: Story = {
  args: { loadingLabel: 'Ýüklenýär' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args}>
        <Plus />
        New booking
      </Button>
      <Button {...args} loading>
        <Plus />
        New booking
      </Button>
      <Button {...args} variant="secondary" loading>
        Save
      </Button>
    </div>
  ),
  play: async ({ args, canvas }) => {
    const rest = canvas.getByRole('button', { name: 'New booking' })
    const busy = canvas.getAllByRole('button', { name: /Ýüklenýär/ })[0]!
    await expect(busy.getBoundingClientRect().width).toBe(rest.getBoundingClientRect().width)
    await expect(busy).toHaveTextContent('New booking')
    await userEvent.click(busy)
    await expect(args.onClick).not.toHaveBeenCalled()
    await expect(busy).toHaveAttribute('aria-busy', 'true')
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

/** The ring 2 px white + 2 px a-400 around the button's own box (A11). */
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

/**
 * Which button each action takes (DS · Controls → «Which button each action takes»): no action is bare text any
 * more; violet text is a Link and only navigates. Remove from the team → danger-quiet M · Turn off → danger-quiet S ·
 * Home (404) → secondary L · Book again → secondary, the same width as Call · Clear, Clear all → tertiary S ·
 * Show more → secondary M · Add note, New setup link → secondary S.
 */
export const WhichButton: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="danger-quiet">Remove from the team</Button>
        <Button variant="danger-quiet" size="s">
          Turn off
        </Button>
        <Button variant="secondary" size="l">
          Home
        </Button>
      </div>
      <div className="flex w-90 gap-2">
        <Button variant="secondary" className="flex-1">
          Call
        </Button>
        <Button variant="secondary" className="flex-1">
          Book again
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="tertiary" size="s">
          Clear all
        </Button>
        <Button variant="secondary">Show more</Button>
        <Button variant="secondary" size="s">
          Add note
        </Button>
        <Button variant="secondary" size="s">
          New setup link
        </Button>
      </div>
    </div>
  ),
}
