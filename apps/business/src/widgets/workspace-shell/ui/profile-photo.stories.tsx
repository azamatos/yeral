/**
 * My profile's photo (B-Shell: avatar 64, "Add photo", "Optional · JPG or PNG"; the states follow B-Settings' photos:
 * uploading, too big, not a photo). The upload is a fake here: the api's `PUT /v1/me/photo` comes with #116, and until
 * then the drawer shows only the picture.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ApiError } from '@yeral/sdk'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { I18nProvider } from '@/shared/i18n'
import { ProfilePhoto } from './profile-photo'

const upload = fn(() => Promise.resolve())

const meta = {
  title: 'Business/Account/ProfilePhoto',
  component: ProfilePhoto,
  decorators: [(Story) => <I18nProvider locale="en">{Story()}</I18nProvider>],
  args: { name: 'Maýsa Annaýewa', upload },
} satisfies Meta<typeof ProfilePhoto>
export default meta
type Story = StoryObj<typeof meta>

const fileInput = (root: HTMLElement) => root.querySelector<HTMLInputElement>('input[type=file]')!
const file = (name: string, type: string, mb = 1) => new File([new Uint8Array(mb * 1_048_576)], name, { type })

/** No photo: the first letter, "Add photo" and what it takes. */
export const Add: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('button', { name: 'Add photo' })).toBeVisible()
    await expect(canvas.getByText('Optional · JPG or PNG')).toBeVisible()
    await userEvent.upload(fileInput(canvasElement), file('me.jpg', 'image/jpeg'))
    await waitFor(() => expect(upload).toHaveBeenCalled())
  },
}

/** A photo already: "Change photo". */
export const Photo: Story = { args: { src: '/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg' } }

/** While it uploads: the button says so and waits. */
export const Uploading: Story = {
  args: { upload: fn(() => new Promise<void>(() => undefined)) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.upload(fileInput(canvasElement), file('me.png', 'image/png'))
    await expect(await canvas.findByRole('button', { name: 'Uploading…' })).toBeVisible()
  },
}

export const TooBig: Story = {
  name: 'Too big',
  play: async ({ canvas, canvasElement }) => {
    await userEvent.upload(fileInput(canvasElement), file('salon-hall.jpg', 'image/jpeg', 14))
    await expect(canvas.getByRole('alert')).toHaveTextContent('salon-hall.jpg is 14 MB. Photos can be up to 10 MB.')
  },
}

export const WrongType: Story = {
  name: 'Not a photo',
  play: async ({ canvas, canvasElement }) => {
    await userEvent.upload(fileInput(canvasElement), file('price-list.pdf', 'application/pdf'), { applyAccept: false })
    await expect(canvas.getByRole('alert')).toHaveTextContent('price-list.pdf isn’t a photo. Use JPG or PNG.')
  },
}

/** The api refused it (or the connection dropped): its words under the picture. */
export const Refused: Story = {
  args: { upload: fn(() => Promise.reject(new ApiError(413, 'validation_error'))) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.upload(fileInput(canvasElement), file('me.jpg', 'image/jpeg'))
    await expect(await canvas.findByRole('alert')).toBeVisible()
    await expect(canvas.getByRole('button', { name: 'Add photo' })).toBeEnabled()
  },
}

/** Until the api takes photos: only the picture, no button that can't work. */
export const NoUploadYet: Story = { args: { upload: undefined } }
