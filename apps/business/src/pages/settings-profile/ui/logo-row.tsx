import { useMutation } from '@tanstack/react-query'
import type { BusinessProfile } from '@yeral/contract/settings'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { FieldMessage } from '@yeral/ui/field'
import { toast } from '@yeral/ui/toast'
import { useId, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { PHOTO_MAX_BYTES } from '@yeral/domain/photos'
import { LOGO_TYPES, squareLogo } from '../lib/square-logo'

/**
 * The logo row (B-Settings «Main details»): the logo at 64 (r14; a letter tile without one), «Logo» with its rule, and
 * «Add logo» / «Change logo», which saves at once (no save bar: it's an upload). A picture that can't be the logo says
 * why under the row; the api's refusal too.
 */
export function LogoRow({ slug, profile }: { slug: string; profile: BusinessProfile }) {
  const t = useTranslations('settings.profile')
  const format = useFormatter()
  const errorText = useErrorText()
  const sdk = useSdk()
  const upload = useMutation(sdk.settings.setLogo(slug))
  const input = useRef<HTMLInputElement>(null)
  const labelId = useId()
  const messageId = useId()
  const [problem, setProblem] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const busy = checking || upload.isPending

  const pick = async (file: File) => {
    setProblem(null)
    setChecking(true)
    const logo = await squareLogo(file)
      .catch(() => ({ ok: false, problem: 'wrongType' }) as const)
      .finally(() => setChecking(false))
    if (!logo.ok)
      return setProblem(
        logo.problem === 'wrongType'
          ? t('logoWrongType', { file: file.name })
          : logo.problem === 'tooBig'
            ? t('logoTooBig', { file: file.name, size: format.number(logo.mb), max: PHOTO_MAX_BYTES / 1_000_000 })
            : t('logoTooSmall', { file: file.name, width: logo.width, height: logo.height }),
      )
    try {
      await upload.mutateAsync(logo.file)
      toast(t('logoSaved'))
    } catch (error) {
      setProblem(errorText(error))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_280px] items-center gap-4">
          <Avatar
            decorative
            name={profile.name}
            src={profile.logo?.url}
            shape="square"
            size={64}
            letters={1}
            className={busy ? 'opacity-60' : undefined}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span id={labelId} className="text-body font-medium text-n-900">
              {t('logo')}
            </span>
            <span className="text-dense text-n-600">{t('logoCaption')}</span>
          </div>
        </div>
        <input
          ref={input}
          type="file"
          accept={LOGO_TYPES.join(',')}
          aria-labelledby={labelId}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void pick(file)
          }}
        />
        <Button
          size="s"
          loading={busy}
          loadingText={t('uploading')}
          aria-describedby={problem ? messageId : undefined}
          onClick={() => input.current?.click()}
        >
          {profile.logo ? t('changeLogo') : t('addLogo')}
        </Button>
      </div>
      {problem && (
        <FieldMessage id={messageId} status="error">
          {problem}
        </FieldMessage>
      )}
    </div>
  )
}
