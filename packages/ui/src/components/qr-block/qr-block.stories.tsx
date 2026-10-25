/**
 * QrBlock — DS-Patterns → «QR block» (B-Settings Link and QR and the setup's last step: the card; compact as B-Onboarding
 * drew it, no screen uses it since 25.10.2026). The code is drawn from `value` in the browser. Stories are the
 * component's tests: one per variant and state.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, spyOn, userEvent, waitFor } from 'storybook/test'
import { QrBlock } from './qr-block'

const value = 'https://yeral.app/b/glow-studio'

const meta = {
  title: 'Display/QrBlock',
  component: QrBlock,
  args: {
    value,
    label: 'QR code for Glow Studio’s page',
    fileName: 'glow-studio-qr',
    title: 'Glow Studio',
    link: 'yeral.app/b/glow-studio',
    description: 'Put it by the till — clients open it on their phone',
    caption: 'PNG for printing, SVG for designers.',
    copy: {
      downloadPng: 'Download PNG',
      downloadSvg: 'Download SVG',
      downloaded: (format) => `QR code downloaded (${format})`,
    },
    onDownload: fn(),
  },
  decorators: [(Story) => <div className="max-w-184">{Story()}</div>],
} satisfies Meta<typeof QrBlock>
export default meta
type Story = StoryObj<typeof meta>

/** Settings → Link and QR: the code at 200 beside the name, the link, the hint and both downloads. */
export const Card: Story = {
  play: async ({ canvas }) => {
    const code = canvas.getByRole('img', { name: 'QR code for Glow Studio’s page' })
    await expect(code).toHaveAttribute('width', '200')
    // the board's link fits a 25-module code; with the 2-module quiet zone the square is 29 wide
    await expect(code).toHaveAttribute('viewBox', '-2 -2 29 29')
    await expect(code).toHaveAttribute('shape-rendering', 'crispEdges')
    await expect(canvas.getByText('yeral.app/b/glow-studio')).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Download PNG' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Download SVG' })).toBeInTheDocument()
    await expect(canvas.getByRole('status')).toBeEmptyDOMElement()
  },
}

/** Compact, as B-Onboarding drew the last step: the code at 120 in its box, the downloads beside it (for a narrow column). */
export const Compact: Story = {
  args: { variant: 'compact', title: undefined, link: undefined, description: undefined, caption: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'QR code for Glow Studio’s page' })).toHaveAttribute('width', '120')
    await expect(canvas.queryByText('Glow Studio')).toBeNull()
  },
}

/** After «Download PNG»: the file goes to the browser and the status line says which one. */
export const Downloaded: Story = {
  args: { variant: 'compact', caption: undefined },
  play: async ({ canvas, args }) => {
    const click = spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    try {
      await userEvent.click(canvas.getByRole('button', { name: 'Download PNG' }))
      await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('QR code downloaded (PNG)'))
      await expect(args.onDownload).toHaveBeenCalledWith('PNG')
      const link = click.mock.contexts[0] as HTMLAnchorElement
      await expect(link.download).toBe('glow-studio-qr.png')
      await userEvent.click(canvas.getByRole('button', { name: 'Download SVG' }))
      await waitFor(() => expect(canvas.getByRole('status')).toHaveTextContent('QR code downloaded (SVG)'))
      await expect((click.mock.contexts[1] as HTMLAnchorElement).download).toBe('glow-studio-qr.svg')
      // the PNG is a data address at print size; the SVG a file of its own
      await expect((click.mock.contexts[0] as HTMLAnchorElement).href).toMatch(/^data:image\/png/)
      await expect((click.mock.contexts[1] as HTMLAnchorElement).href).toMatch(/^blob:/)
    } finally {
      click.mockRestore()
    }
  },
}

/** A longer address takes a bigger code; the quiet zone stays 2 modules on each side. */
export const LongerLink: Story = {
  args: {
    value: 'https://yeral.app/b/glow-studio-beauty-and-nails-on-the-main-street',
    link: 'yeral.app/b/glow-studio-beauty-and-nails-on-the-main-street',
  },
  play: async ({ canvas }) => {
    const [x, y, w, h] = (canvas.getByRole('img', { name: 'QR code for Glow Studio’s page' }).getAttribute('viewBox') ?? '')
      .split(' ')
      .map(Number)
    await expect([x, y]).toEqual([-2, -2])
    await expect(w).toBe(h)
    await expect(w).toBeGreaterThan(29)
  },
}
