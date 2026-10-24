import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GALLERY_MAX, PHOTO_MAX_BYTES } from '@yeral/domain/photos'
import { FieldMessage } from '@yeral/ui/field'
import { PhotoGrid, type PhotoGridPending } from '@yeral/ui/photo-grid'
import { SettingsSection } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { LOGO_TYPES } from '../lib/square-logo'
import { shrinkPhoto } from '../lib/shrink-photo'

/** «Add 3+ photos» on the done step's checklist and the hint here (design §27.2: pages with 3+ get seen more). */
const PHOTOS_GOOD = 3

/** Where the sent-back box's «Go to photos» goes. */
export const PHOTOS_ANCHOR = 'photos'

/**
 * The photos (B-Settings «Photos», design §28.5): «5 of 20», the cover first («The first photo is your cover…»), the
 * grid with «Make cover», remove, drag and keyboard moving, and the add tile; each change saves at once (no save bar).
 * Files are checked and shrunk before they go, one after another; a refused one shows as a dashed tile with why under
 * the grid. Fewer than 3: the hint that more get seen more.
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
  const [pending, setPending] = useState<PhotoGridPending[]>([])
  const [refused, setRefused] = useState<{ id: string; text: string } | null>(null)

  if (!gallery.data)
    return (
      <SettingsSection id={PHOTOS_ANCHOR} aria-labelledby={titleId}>
        <h3 id={titleId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
          {t('title')}
        </h3>
        <div className="flex justify-center py-8">
          {gallery.isError ? <FieldMessage status="error">{errorText(gallery.error)}</FieldMessage> : <Spinner />}
        </div>
      </SettingsSection>
    )

  const photos = gallery.data.items
  const uploading = pending.filter((p) => p.state === 'uploading').length
  const room = GALLERY_MAX - photos.length - uploading

  const addFiles = async (files: File[]) => {
    setRefused(null)
    const taken = files.slice(0, Math.max(0, room))
    if (files.length > taken.length) toast(t('full', { max: GALLERY_MAX }))
    for (const file of taken) {
      const id = `${file.name}-${crypto.randomUUID()}`
      setPending((list) => [...list, { id, name: file.name, state: 'uploading' }])
      const photo = await shrinkPhoto(file).catch(() => ({ ok: false, problem: 'wrongType' }) as const)
      if (!photo.ok) {
        const tooBig = photo.problem === 'tooBig'
        const size = tooBig ? format.number(photo.mb) : ''
        setPending((list) =>
          list.map((p) =>
            p.id === id ? { id, name: file.name, state: 'bad', tile: tooBig ? t('tooBigTile', { size }) : t('wrongTypeTile') } : p,
          ),
        )
        setRefused({
          id,
          text: tooBig ? t('tooBig', { file: file.name, size, max: PHOTO_MAX_BYTES / 1_000_000 }) : t('wrongType', { file: file.name }),
        })
        continue
      }
      try {
        await add.mutateAsync(photo.file)
        setPending((list) => list.filter((p) => p.id !== id))
      } catch (error) {
        setPending((list) => list.filter((p) => p.id !== id))
        toast(errorText(error))
      }
    }
  }

  const reorder = (ids: string[]) => {
    const key = sdk.settings.gallery(slug).queryKey
    const before = gallery.data
    // the new order at once; the api's answer (the gallery) or a refresh confirms it
    queryClient.setQueryData(key, { items: ids.flatMap((id) => photos.find((p) => p.id === id) ?? []) })
    order.mutate(ids, {
      onSuccess: (data) => queryClient.setQueryData(key, data),
      onError: (error) => {
        queryClient.setQueryData(key, before)
        toast(errorText(error))
      },
    })
  }

  const few = photos.length < PHOTOS_GOOD
  return (
    <SettingsSection id={PHOTOS_ANCHOR} aria-labelledby={titleId}>
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h3 id={titleId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
            {t('title')}
          </h3>
          <span className="text-dense text-n-600 tabular-nums">{t('count', { count: photos.length, max: GALLERY_MAX })}</span>
        </div>
        <p className="m-0 text-dense text-n-600">{t('caption')}</p>
      </div>
      <PhotoGrid
        photos={photos.map((p, i) => ({ id: p.id, src: p.url, name: p.alt.trim() || t('photoN', { n: i + 1 }) }))}
        pending={pending}
        canAdd={room > 0}
        accept={LOGO_TYPES.join(',')}
        disabled={remove.isPending || order.isPending}
        onAdd={(files) => void addFiles(files)}
        onRemove={(id) => remove.mutate(id, { onError: (error) => toast(errorText(error)) })}
        onReorder={reorder}
        onDismiss={(id) => {
          setPending((list) => list.filter((p) => p.id !== id))
          if (refused?.id === id) setRefused(null)
        }}
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
        {refused && <FieldMessage status="error">{refused.text}</FieldMessage>}
        <span className="text-dense text-n-600">{t('rule', { max: GALLERY_MAX, mb: PHOTO_MAX_BYTES / 1_000_000 })}</span>
        {few && <span className="text-dense font-semibold text-st-pending-ink">{t('few', { count: PHOTOS_GOOD - photos.length })}</span>}
      </div>
    </SettingsSection>
  )
}
