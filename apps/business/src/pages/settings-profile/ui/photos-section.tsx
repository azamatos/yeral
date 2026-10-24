import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GALLERY_GOOD, GALLERY_MAX, PHOTO_KINDS, PHOTO_MAX_BYTES } from '@yeral/domain/photos'
import { FieldMessage } from '@yeral/ui/field'
import { PhotoGrid, type PhotoGridPending } from '@yeral/ui/photo-grid'
import { SettingsSection } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { useId, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { shrinkPhoto } from '../lib/shrink-photo'

/** Where the sent-back box's «Go to photos» goes. */
export const PHOTOS_ANCHOR = 'photos'

const ACCEPT = Object.values(PHOTO_KINDS).join(',')

/** A file on the grid before it's a photo: on its way, or refused with why. */
type Waiting = PhotoGridPending & { message?: string }

/**
 * The photos (B-Settings «Photos», design §28.5): «5 of 20», the cover first («The first photo is your cover…»), the
 * grid with «Make cover», remove, drag and keyboard moving, and the add tile; each change saves at once (no save bar).
 * Files picked show at once and go one after another, checked and shrunk first; a refused one stays as a dashed tile
 * with why under the grid until dismissed. The order can't change while files are on their way (it lists every photo).
 * Fewer than 3: the hint that more get seen more.
 */
export function PhotosSection({ slug }: { slug: string }) {
  const t = useTranslations('settings.profile.photos')
  const format = useFormatter()
  const errorText = useErrorText()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const titleId = useId()
  const gallery = useQuery(sdk.settings.gallery(slug))
  const add = useMutation(sdk.settings.addPhoto(slug))
  const remove = useMutation(sdk.settings.removePhoto(slug))
  const order = useMutation(sdk.settings.orderPhotos(slug))
  const [waiting, setWaiting] = useState<Waiting[]>([])
  const nextId = useRef(0)

  const title = (
    <h3 id={titleId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
      {t('title')}
    </h3>
  )
  if (!gallery.data)
    return (
      <SettingsSection id={PHOTOS_ANCHOR} aria-labelledby={titleId}>
        {title}
        <div className="flex justify-center py-8">
          {gallery.isError ? <FieldMessage status="error">{errorText(gallery.error)}</FieldMessage> : <Spinner />}
        </div>
      </SettingsSection>
    )

  const photos = gallery.data.items
  const uploading = waiting.filter((w) => w.state === 'uploading').length
  const room = GALLERY_MAX - photos.length - uploading

  const settle = (id: string, change: Waiting | null) =>
    setWaiting((list) => (change ? list.map((w) => (w.id === id ? change : w)) : list.filter((w) => w.id !== id)))

  const addFiles = async (files: File[]) => {
    const taken = files.slice(0, Math.max(0, room)).map((file) => ({ file, id: `file-${++nextId.current}` }))
    if (files.length > taken.length) toast(t('full', { max: GALLERY_MAX }))
    // every file shows at once, so the room left counts them all
    setWaiting((list) => [...list, ...taken.map(({ file, id }) => ({ id, name: file.name, state: 'uploading' as const }))])
    for (const { file, id } of taken) {
      const photo = await shrinkPhoto(file).catch(() => ({ ok: false, problem: 'wrongType' }) as const)
      if (!photo.ok) {
        const tooBig = photo.problem === 'tooBig'
        const size = tooBig ? format.number(photo.mb) : ''
        settle(id, {
          id,
          name: file.name,
          state: 'bad',
          tile: tooBig ? t('tooBigTile', { size }) : t('wrongTypeTile'),
          message: tooBig ? t('tooBig', { file: file.name, size, max: PHOTO_MAX_BYTES / 1_000_000 }) : t('wrongType', { file: file.name }),
        })
        continue
      }
      try {
        await add.mutateAsync(photo.file)
        settle(id, null)
      } catch (error) {
        settle(id, null)
        toast(errorText(error))
      }
    }
  }

  const reorder = async (ids: string[]) => {
    const key = sdk.settings.gallery(slug).queryKey
    // a refresh on its way would put the old order back over the new one
    await queryClient.cancelQueries({ queryKey: key })
    const before = queryClient.getQueryData(key)
    queryClient.setQueryData(key, { items: ids.flatMap((id) => photos.find((p) => p.id === id) ?? []) })
    order.mutate(ids, {
      onError: (error) => {
        queryClient.setQueryData(key, before)
        toast(errorText(error))
      },
    })
  }

  const refused = waiting.flatMap((w) => (w.message ? [w] : []))
  const few = photos.length < GALLERY_GOOD
  return (
    <SettingsSection id={PHOTOS_ANCHOR} aria-labelledby={titleId}>
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title}
          <span className="text-dense text-n-600 tabular-nums">{t('count', { count: photos.length, max: GALLERY_MAX })}</span>
        </div>
        <p className="m-0 text-dense text-n-600">{t('caption')}</p>
      </div>
      <PhotoGrid
        // the api names every photo after the business: they're told apart by their place
        photos={photos.map((p, i) => ({ id: p.id, src: p.url, name: t('photoN', { n: i + 1 }) }))}
        pending={waiting}
        canAdd={room > 0}
        accept={ACCEPT}
        busy={remove.isPending || order.isPending}
        locked={uploading > 0}
        onAdd={(files) => void addFiles(files)}
        onRemove={(id) => remove.mutate(id, { onError: (error) => toast(errorText(error)) })}
        onReorder={(ids) => void reorder(ids)}
        onDismiss={(id) => settle(id, null)}
        words={{
          cover: t('cover'),
          makeCover: t('makeCover'),
          makeCoverOf: (name) => t('makeCoverOf', { name }),
          remove: (name) => t('remove', { name }),
          move: (name) => t('move', { name }),
          position: (name, at, total) => t('position', { name, at, total }),
          dropped: (name, at, total) => t('dropped', { name, at, total }),
          cancelled: (name) => t('cancelled', { name }),
          uploading: t('uploading'),
          uploadingLabel: (name) => t('uploadingLabel', { name }),
          dismiss: (name) => t('dismiss', { name }),
          add: t('add'),
        }}
      />
      <div className="flex flex-col gap-1">
        {refused.map((w) => (
          <FieldMessage key={w.id} status="error">
            {w.message}
          </FieldMessage>
        ))}
        <span className="text-dense text-n-600">{t('rule', { max: GALLERY_MAX, mb: PHOTO_MAX_BYTES / 1_000_000 })}</span>
        {few && <span className="text-dense font-semibold text-st-pending-ink">{t('few', { count: GALLERY_GOOD - photos.length })}</span>}
      </div>
    </SettingsSection>
  )
}
