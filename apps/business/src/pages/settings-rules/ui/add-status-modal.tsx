import { useMutation } from '@tanstack/react-query'
import { INTERNAL_STATUS_COLORS, INTERNAL_STATUS_ICONS, INTERNAL_STATUS_NAME_MAX } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { IconPicker } from '@yeral/ui/icon-picker'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { SwatchPicker } from '@yeral/ui/swatch-picker'
import { toast } from '@yeral/ui/toast'
import { Check, EyeOff } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { nameTaken } from '../model/statuses'
import { COLOUR_KEY, INTERNAL_STATUS_ICON } from './status-icons'

type Icon = (typeof INTERNAL_STATUS_ICONS)[number]
type Colour = (typeof INTERNAL_STATUS_COLORS)[number]

/** A fresh form (B-Settings `stBlank`): no name, the flag, violet. */
const BLANK = { name: '', icon: 'flag' as Icon, color: INTERNAL_STATUS_COLORS[0] as Colour }

/** The preview block's start (B-Settings `.pvb`: 11:30). */
const PREVIEW_START = 11 * 60 + 30

/**
 * «Add internal status» (B-Settings `statusModal`, book B-29): a name up to 20 that no system or internal status has,
 * one of 8 icons, one of 6 colours, and a preview of the chip on a calendar block and in the booking. Add saves it
 * (switched on) and says so; `taken` are the names the team already reads, `full` when five are there (another tab
 * may add one while it's open). While Add is on its way the dialog stays.
 */
export function AddStatusModal({
  slug,
  taken,
  full,
  trigger,
}: {
  slug: string
  taken: readonly string[]
  full: boolean
  trigger: ReactNode
}) {
  const t = useTranslations('settings.statuses')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const add = useMutation(sdk.settings.addStatus(slug))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [refused, setRefused] = useState<string | null>(null)
  const nameId = useId()
  const iconId = useId()
  const colourId = useId()
  const name = form.name.trim()
  const dup = nameTaken(name, taken) || (!!refused && refused === name)
  const Icon = INTERNAL_STATUS_ICON[form.icon]

  const openChange = (next: boolean) => {
    // closing waits for Add: its answer belongs to this form
    if (!next && add.isPending) return
    setOpen(next)
    setForm(BLANK)
    setRefused(null)
  }

  const submit = () => {
    if (!name || dup || full) return
    add.mutate(
      { name, icon: form.icon, color: form.color },
      {
        onSuccess: () => {
          toast(t('added', { name }))
          setOpen(false)
          setForm(BLANK)
        },
        // another tab took the name meanwhile
        onError: (error) => (isApiError(error, 'validation_error') ? setRefused(name) : toast(errorText(error))),
      },
    )
  }

  return (
    <Modal open={open} onOpenChange={openChange}>
      {trigger}
      <ModalContent size={480} aria-describedby={undefined}>
        <ModalHeader title={t('addTitle')} closeLabel={t('close')} />
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field
            id={nameId}
            label={t('name')}
            error={dup && t('nameTaken')}
            counter={
              dup
                ? undefined
                : {
                    value: form.name.length,
                    max: INTERNAL_STATUS_NAME_MAX,
                    text: t('nameCount', { n: form.name.length, max: INTERNAL_STATUS_NAME_MAX }),
                  }
            }
          >
            <Input
              className="h-11"
              maxLength={INTERNAL_STATUS_NAME_MAX}
              placeholder={t('namePlaceholder')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span id={iconId} className="text-dense font-semibold text-n-900">
              {t('icon')}
            </span>
            <IconPicker
              aria-labelledby={iconId}
              value={form.icon}
              onValueChange={(icon) => setForm((f) => ({ ...f, icon: icon as Icon }))}
              options={INTERNAL_STATUS_ICONS.map((key) => {
                const Glyph = INTERNAL_STATUS_ICON[key]
                return { value: key, label: t(`icons.${key}`), icon: <Glyph aria-hidden /> }
              })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span id={colourId} className="text-dense font-semibold text-n-900">
              {t('colour')}
            </span>
            <SwatchPicker
              aria-labelledby={colourId}
              value={form.color}
              onValueChange={(color) => setForm((f) => ({ ...f, color: color as Colour }))}
              options={INTERNAL_STATUS_COLORS.map((hex) => ({ value: hex, label: t(`colours.${COLOUR_KEY[hex]}`), color: hex }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-dense font-semibold text-n-900">{t('preview')}</span>
            <div className="flex flex-wrap items-center gap-4 rounded-m bg-n-50 p-4">
              {/* a confirmed calendar block with the chip in its corner (B-Settings `.pvb`) */}
              <div
                aria-hidden
                className="relative flex w-52 flex-col gap-0.5 rounded-input border border-a-line bg-a-50 py-2 pr-8 pl-2.5 text-dense text-n-900"
              >
                <span className="flex items-center gap-1.5 font-semibold tabular-nums">
                  <Check strokeWidth={2} className="size-3.5 text-a-600" />
                  {t('previewBlock', { time: fmt.time(PREVIEW_START) })}
                </span>
                <span className="text-n-600">{t('previewService')}</span>
                <span
                  className="absolute top-1.5 right-1.5 inline-flex size-4.5 items-center justify-center rounded-pill bg-n-0 shadow-control"
                  style={{ color: form.color }}
                >
                  <Icon strokeWidth={2} className="size-3" />
                </span>
              </div>
              <span className="inline-flex h-6.5 items-center gap-1.5 rounded-pill border border-n-200 bg-n-0 pr-2.5 pl-2 text-dense font-semibold whitespace-nowrap text-n-900">
                <Icon aria-hidden strokeWidth={2} className="size-3.5" style={{ color: form.color }} />
                {name || t('previewName')}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-dense text-n-600">
              <EyeOff aria-hidden strokeWidth={1.75} className="size-3.5 flex-none" />
              {t('previewNote')}
            </span>
          </div>
          <ModalActions>
            <Button type="button" variant="secondary" disabled={add.isPending} onClick={() => openChange(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={!name || dup || full} loading={add.isPending} loadingLabel={t('adding')}>
              {t('add')}
            </Button>
          </ModalActions>
        </form>
      </ModalContent>
    </Modal>
  )
}
