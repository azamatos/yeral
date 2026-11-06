import { useMutation, useQuery } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { FieldMessage } from '@yeral/ui/field'
import { KeyValueList } from '@yeral/ui/key-value'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/**
 * The card's side (B-Client `.caside`, book B-34 step 5, B-35): Phone only with its three captions and Don't send
 * reminders for those who manage clients, how they found you and the birthday for everyone, Delete client. A specialist
 * reads «Details» and nothing there changes.
 */
export function ClientAside({ slug, card, manage, onDelete }: { slug: string; card: ClientCard; manage: boolean; onDelete: () => void }) {
  const t = useTranslations('clientCard.settings')
  const sources = useTranslations('clients.sources')
  const fmt = useFmt()
  const headingId = useId()
  return (
    <aside
      aria-labelledby={headingId}
      className="flex min-w-0 flex-[1_1_320px] flex-col gap-3 rounded-card border border-n-200 p-5 min-[1240px]:max-w-80"
    >
      <h2 id={headingId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
        {manage ? t('title') : t('details')}
      </h2>
      <div className="flex flex-col">
        {manage && <Switches slug={slug} card={card} />}
        <KeyValueList
          variant="compact"
          items={[
            { key: t('source'), value: card.source ? sources(card.source) : t('notGiven'), muted: !card.source },
            { key: t('birthday'), value: card.birthday ? fmt.dayMonth(card.birthday) : t('notGiven'), muted: !card.birthday },
          ]}
        />
      </div>
      {manage && (
        <div className="border-t border-n-200 pt-2">
          <Button variant="danger-quiet" size="s" className="-ml-2.5" onClick={onDelete}>
            <Trash2 aria-hidden />
            {t('delete')}
          </Button>
        </div>
      )}
    </aside>
  )
}

function Switches({ slug, card }: { slug: string; card: ClientCard }) {
  const t = useTranslations('clientCard.settings')
  const sdk = useSdk()
  const errorText = useErrorText()
  const update = useMutation(sdk.clients.update(slug))
  const rules = useQuery({ ...sdk.settings.rules(slug), retry: false })
  // the caption after switching it off, for as long as the card stays open
  const [back, setBack] = useState<'count' | 'hand' | null>(null)
  const { phoneOnly, phoneOnlyByCount, noReminders } = card.settings
  const limit = rules.data?.blockAfterNoShows ?? 0

  const change = (patch: { phoneOnly?: boolean; noReminders?: boolean }, words: string, done?: () => void) =>
    update.mutate(
      { id: card.id, ...patch },
      {
        onSuccess: () => {
          done?.()
          toast(words)
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  const flipPhone = (on: boolean) =>
    change({ phoneOnly: on }, on ? t('phoneOn') : t('phoneOff'), () => setBack(on ? null : phoneOnlyByCount ? 'count' : 'hand'))
  const flipReminders = (on: boolean) => change({ noReminders: on }, on ? t('remindersOff') : t('remindersOn'))

  return (
    <>
      <SwitchRow
        label={t('phoneOnly')}
        caption={
          phoneOnly ? (
            <FieldMessage status="warning">
              {phoneOnlyByCount ? t('phoneByCount', { n: card.stats.noShows }) : t('phoneByHand')}
            </FieldMessage>
          ) : back ? (
            <FieldMessage status="success">{back === 'count' ? t('phoneBackCount') : t('phoneBack')}</FieldMessage>
          ) : (
            <>
              {t('phoneIdle')}
              {limit > 0 && ` ${t('phoneIdleAuto', { n: limit })}`}
            </>
          )
        }
        checked={phoneOnly}
        disabled={update.isPending}
        onChange={flipPhone}
      />
      <SwitchRow
        label={t('reminders')}
        caption={t('remindersCaption')}
        checked={noReminders}
        disabled={update.isPending}
        onChange={flipReminders}
        className="pt-3.5"
      />
    </>
  )
}

function SwitchRow({
  label,
  caption,
  checked,
  disabled,
  onChange,
  className,
}: {
  label: string
  caption: ReactNode
  checked: boolean
  disabled: boolean
  onChange: (on: boolean) => void
  className?: string
}) {
  const id = useId()
  return (
    <div className={`flex items-center justify-between gap-3 border-b border-n-200 pb-3.5 ${className ?? ''}`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={id} className="text-small font-medium text-n-900">
          {label}
        </span>
        <span id={`${id}-caption`} className="text-dense text-n-600">
          {caption}
        </span>
      </div>
      <Switch aria-labelledby={id} aria-describedby={`${id}-caption`} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}
