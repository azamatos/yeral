/**
 * Inputs/PhotoManager — DS-Business «PhotoManager», B-Settings `.phg` (Business profile's photos): the cover first with
 * its chip, «Make cover» on the others, remove, the drag handle with keyboard moving, an upload on its way, a refused
 * file, the add tile. Stories are the component's tests: one per state, the keyboard, a phone and a Russian length.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, fn, userEvent } from 'storybook/test'
import { PhotoGrid, type PhotoGridPending, type PhotoGridPhoto, type PhotoGridWords } from './photo-grid'

// flat squares in the brand's tints: no network in the stories
const tile = (fill: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4"><rect width="4" height="4" fill="${fill}"/></svg>`)}`

const PHOTOS: PhotoGridPhoto[] = [
  { id: 'hall', src: tile('#d5cbfb'), name: 'Salon hall' },
  { id: 'chair', src: tile('#bfe6d1'), name: 'Styling chair' },
  { id: 'nails', src: tile('#f2ddb0'), name: 'Nail desk' },
  { id: 'door', src: tile('#d6e0ec'), name: 'Entrance' },
]

const EN: PhotoGridWords = {
  cover: 'Cover photo',
  makeCover: 'Make cover',
  makeCoverOf: (name) => `Make cover: ${name}`,
  remove: (name) => `Remove photo: ${name}`,
  move: (name) => `Move: ${name}`,
  position: (name, at, total) => `${name}, ${at} of ${total}`,
  dropped: (name, at, total) => `${name} put at ${at} of ${total}`,
  cancelled: (name) => `${name} back in its place`,
  uploading: 'Uploading…',
  uploadingLabel: (name) => `Uploading ${name}`,
  dismiss: (name) => `Dismiss ${name}`,
  add: 'Add photo',
}

const RU: PhotoGridWords = {
  ...EN,
  cover: 'Обложка',
  makeCover: 'Сделать обложкой',
  makeCoverOf: (name) => `Сделать обложкой: ${name}`,
  uploading: 'Загружаем…',
  add: 'Добавить фото',
}

const onReorder = fn()
const onRemove = fn()
const onAdd = fn()

/** The grid with its own order, as the page keeps it from the api's answer. */
function Grid({ pending, words = EN, canAdd = true }: { pending?: PhotoGridPending[]; words?: PhotoGridWords; canAdd?: boolean }) {
  const [photos, setPhotos] = useState(PHOTOS)
  const [waiting, setWaiting] = useState(pending ?? [])
  return (
    <div className="max-w-text">
      <PhotoGrid
        photos={photos}
        pending={waiting}
        canAdd={canAdd}
        accept="image/jpeg,image/png,image/webp"
        words={words}
        onAdd={onAdd}
        onRemove={(id) => {
          onRemove(id)
          setPhotos((list) => list.filter((p) => p.id !== id))
        }}
        onReorder={(ids) => {
          onReorder(ids)
          setPhotos((list) => ids.flatMap((id) => list.find((p) => p.id === id) ?? []))
        }}
        onDismiss={(id) => setWaiting((list) => list.filter((f) => f.id !== id))}
      />
    </div>
  )
}

const meta = { title: 'Inputs/PhotoManager', component: Grid } satisfies Meta<typeof Grid>
export default meta
type Story = StoryObj<typeof meta>

/** The cover first with its chip; the others «Make cover», which puts that one first. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')[0]).toHaveTextContent('Cover photo')
    await userEvent.click(canvas.getByRole('button', { name: 'Make cover: Nail desk' }))
    await expect(onReorder).toHaveBeenLastCalledWith(['nails', 'hall', 'chair', 'door'])
    await expect(canvas.getAllByRole('button', { name: /^Move: / })[0]).toHaveAccessibleName('Move: Nail desk')
  },
}

/** Remove takes a photo out. */
export const Remove: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Remove photo: Styling chair' }))
    await expect(onRemove).toHaveBeenLastCalledWith('chair')
    await expect(canvas.queryByRole('button', { name: 'Move: Styling chair' })).toBeNull()
  },
}

/** The keyboard: Space picks a photo up, → moves it, Space puts it down; each step is said. Esc puts it back. */
export const Keyboard: Story = {
  play: async ({ canvas }) => {
    onReorder.mockClear()
    canvas.getByRole('button', { name: 'Move: Salon hall' }).focus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('button', { name: 'Move: Salon hall' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.keyboard('{ArrowRight}{ArrowRight}')
    await expect(canvas.getByRole('status')).toHaveTextContent('Salon hall, 3 of 4')
    await userEvent.keyboard(' ')
    await expect(onReorder).toHaveBeenLastCalledWith(['chair', 'nails', 'hall', 'door'])
    await expect(canvas.getByRole('status')).toHaveTextContent('Salon hall put at 3 of 4')
    canvas.getByRole('button', { name: 'Move: Entrance' }).focus()
    await userEvent.keyboard(' {ArrowLeft}{Escape}')
    await expect(canvas.getByRole('status')).toHaveTextContent('Entrance back in its place')
    await expect(onReorder).toHaveBeenCalledTimes(1)
  },
}

/** A file on its way, and a refused one with dismiss. */
export const Pending: Story = {
  args: {
    pending: [
      { id: 'up', name: 'salon-hall.jpg', state: 'uploading' },
      { id: 'bad', name: 'price-list.pdf', state: 'bad', tile: 'Not a photo' },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('listitem', { name: 'Uploading salon-hall.jpg' })).toHaveTextContent('Uploading…')
    await userEvent.click(canvas.getByRole('button', { name: 'Dismiss price-list.pdf' }))
    await expect(canvas.queryByText('Not a photo')).toBeNull()
  },
}

/** The add tile takes several files at once. */
export const Add: Story = {
  play: async ({ canvas }) => {
    const a = new File(['a'], 'a.jpg', { type: 'image/jpeg' })
    const b = new File(['b'], 'b.png', { type: 'image/png' })
    await userEvent.upload(canvas.getByLabelText('Add photo'), [a, b])
    await expect(onAdd).toHaveBeenLastCalledWith([a, b])
  },
}

/** 20 photos: no add tile. */
export const Full: Story = {
  args: { canAdd: false },
  play: async ({ canvas }) => {
    await expect(canvas.queryByLabelText('Add photo')).toBeNull()
  },
}

/** A phone: three in a row. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the chips stay on one line, «Сделать обложкой» fits a tile. */
export const RussianLength: Story = { name: 'Russian (+30% length)', args: { words: RU } }
