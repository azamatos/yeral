import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { FieldMessage } from '@yeral/ui/field'
import { Camera } from 'lucide-react'
import { useId, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

/** What the drawer takes (B-Shell "Optional · JPG or PNG"); the size cap is the business photos' (B-Settings, 10 MB). */
const TYPES = ['image/jpeg', 'image/png']
export const PHOTO_MAX_MB = 10

/**
 * The person's photo in My profile (B-Shell: avatar 64 and "Add photo", "Optional · JPG or PNG"; the states follow the
 * business photos': uploading, too big, not a photo, refused). `upload` sends the picked file; without it (the api takes no
 * photo yet) there's only the picture, never a button that can't work.
 */
export function ProfilePhoto({ name, src, upload }: { name: string; src?: string | null; upload?: (file: File) => Promise<unknown> }) {
  const t = useTranslations('shell.profile')
  const format = useFormatter()
  const errorText = useErrorText()
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [refused, setRefused] = useState<string | null>(null)

  const pick = (file: File) => {
    setRefused(null)
    const mb = file.size / 1_048_576
    if (!TYPES.includes(file.type)) return setRefused(t('photoWrongType', { file: file.name }))
    if (mb > PHOTO_MAX_MB) return setRefused(t('photoTooBig', { file: file.name, size: format.number(Math.ceil(mb)), max: PHOTO_MAX_MB }))
    setUploading(true)
    void upload?.(file)
      // refused or lost: the api's words under the picture, which stays as it was
      .catch((error: unknown) => setRefused(errorText(error)))
      .finally(() => setUploading(false))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <Avatar decorative name={name} src={src} size={64} letters={1} className={uploading ? 'opacity-60' : undefined} />
        {upload && (
          <div className="flex flex-col items-start gap-1.5">
            <input
              ref={input}
              id={inputId}
              type="file"
              accept={TYPES.join(',')}
              // picked through the button; named the same for whoever reaches it
              aria-label={src ? t('changePhoto') : t('addPhoto')}
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) pick(file)
              }}
            />
            <Button variant="secondary" size="s" loading={uploading} loadingText={t('uploading')} onClick={() => input.current?.click()}>
              <Camera aria-hidden />
              {src ? t('changePhoto') : t('addPhoto')}
            </Button>
            <span className="text-dense text-n-600">{t('photoHint')}</span>
          </div>
        )}
      </div>
      {refused && <FieldMessage>{refused}</FieldMessage>}
    </div>
  )
}
