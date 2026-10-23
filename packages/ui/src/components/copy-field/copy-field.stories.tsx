/**
 * CopyField — DS-Patterns → «Copy field» (B-Settings Link and QR, B-Onboarding's last step, B-Client's phone). The
 * clipboard is stubbed in the stories. Stories are the component's tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Phone } from 'lucide-react'
import { expect, fn, spyOn, userEvent, waitFor, within } from 'storybook/test'
import { Button } from '../button'
import { CopyField } from './copy-field'

const link = 'https://yeral.app/b/glow-studio'

const meta = {
  title: 'Inputs/CopyField',
  component: CopyField,
  args: {
    value: link,
    display: 'yeral.app/b/glow-studio',
    label: 'Your page link',
    copy: { copy: 'Copy', copied: 'Copied' },
    onCopy: fn(),
  },
  decorators: [(Story) => <div className="max-w-140">{Story()}</div>],
} satisfies Meta<typeof CopyField>
export default meta
type Story = StoryObj<typeof meta>

const stubClipboard = () => spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

/** The link read-only in its 44 field with Copy; the field selects its text when focused. */
export const Default: Story = {
  play: async ({ canvas }) => {
    const field = canvas.getByRole('textbox', { name: 'Your page link' })
    await expect(field).toHaveAttribute('readonly')
    await expect(field).toHaveValue('yeral.app/b/glow-studio')
    await expect(canvas.queryByRole('button', { name: 'Share' })).toBeNull()
  },
}

/** Copy puts the full address on the clipboard, reads «Copied» with a check for 2 s, then «Copy» again. */
export const Copied: Story = {
  play: async ({ canvas, args }) => {
    const write = stubClipboard()
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
      await expect(write).toHaveBeenCalledWith(link)
      await expect(await canvas.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
      await expect(args.onCopy).toHaveBeenCalledOnce()
      await waitFor(() => expect(canvas.getByRole('button', { name: 'Copy' })).toBeInTheDocument(), { timeout: 3000 })
    } finally {
      write.mockRestore()
    }
  },
}

/** Share opens a menu of places, each a link to a new tab. */
export const WithShare: Story = {
  args: {
    share: {
      label: 'Share',
      targets: [
        { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(link)}` },
        { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${encodeURIComponent(link)}` },
      ],
    },
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Share' }))
    const menu = await within(canvasElement.ownerDocument.body).findByRole('menu', { name: 'Share' })
    const whatsapp = within(menu).getByRole('menuitem', { name: 'WhatsApp' })
    await expect(whatsapp).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(link)}`)
    await expect(whatsapp).toHaveAttribute('target', '_blank')
    await userEvent.keyboard('{Escape}')
  },
}

/**
 * When the clipboard refuses, nothing claims a copy: the field shows the full address Copy would have copied, selected
 * for ⌘C.
 */
export const ClipboardRefused: Story = {
  play: async ({ canvas, args }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    try {
      const field = canvas.getByRole<HTMLInputElement>('textbox', { name: 'Your page link' })
      await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
      await waitFor(() => expect(field).toHaveValue(link))
      await waitFor(() => expect([field.selectionStart, field.selectionEnd]).toEqual([0, link.length]))
      await expect(canvas.queryByRole('button', { name: 'Copied' })).toBeNull()
      await expect(args.onCopy).not.toHaveBeenCalled()
    } finally {
      write.mockRestore()
    }
  },
}

/** The inline value when the clipboard refuses: the number's text is selected instead. */
export const InlineClipboardRefused: Story = {
  args: { variant: 'inline', value: '+99365447019', display: '+993 65 44 70 19', label: 'Copy number' },
  play: async ({ canvas, args }) => {
    const write = spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Copy number' }))
      await waitFor(() => expect(window.getSelection()?.toString()).toBe('+993 65 44 70 19'))
      await expect(args.onCopy).not.toHaveBeenCalled()
    } finally {
      write.mockRestore()
      window.getSelection()?.removeAllRanges()
    }
  },
}

/** A value as text with a ghost icon button, beside other actions (B-Client's phone with Call). */
export const InlineValue: Story = {
  args: { variant: 'inline', value: '+99365447019', display: '+993 65 44 70 19', label: 'Copy number' },
  render: (args) => (
    <CopyField {...args}>
      <Button size="s">
        <Phone aria-hidden />
        Call
      </Button>
    </CopyField>
  ),
  play: async ({ canvas }) => {
    const write = stubClipboard()
    try {
      await expect(canvas.getByText('+993 65 44 70 19')).toBeInTheDocument()
      await userEvent.click(canvas.getByRole('button', { name: 'Copy number' }))
      await expect(write).toHaveBeenCalledWith('+99365447019')
      await expect(await canvas.findByText('Copied')).toBeInTheDocument()
    } finally {
      write.mockRestore()
    }
  },
}
