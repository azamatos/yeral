import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { CLIENT_TAG_MAX, CLIENT_TAGS_MAX } from '@yeral/domain/clients'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Pill } from '@yeral/ui/pill'
import { TagEditor } from '@yeral/ui/tag-input'
import { toast } from '@yeral/ui/toast'
import { Copy, Phone } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { ClientAutoTags } from '@/entities/client'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/**
 * The card's head (B7-Clients B6, DS-Lists A7 FactList and A8): the avatar, the full name, the number with Copy and
 * Call, «Ýeral account» when an account holds the number; the tags edited in place (Enter saves at once, Undo after a
 * removal; the automatic ones outlined and not removable); the facts with labels — Client since, Source, Birthday —
 * in a row, one per line on a phone; Change for those who manage clients.
 */
export function ClientHead({ slug, card, manage, onEdit }: { slug: string; card: ClientCard; manage: boolean; onEdit: () => void }) {
  const t = useTranslations('clientCard')
  const clients = useTranslations('clients')
  const sources = useTranslations('clients.sources')
  const fmt = useFmt()
  const { phone } = card
  const copy = (number: string) => void navigator.clipboard.writeText(fmt.phone(number)).then(() => toast(clients('copied')))
  const facts = [
    { label: t('facts.since'), value: fmt.monthYear(card.since) },
    card.source && { label: t('facts.source'), value: sources(card.source) },
    card.birthday && { label: t('facts.birthday'), value: fmt.dayMonth(card.birthday) },
  ].filter((f) => !!f)
  return (
    <div className="flex items-start gap-5 pb-7 max-sm:flex-wrap max-sm:gap-4">
      <Avatar name={card.name ?? ''} size={64} letters={1} tone="tint" decorative />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] [overflow-wrap:anywhere] text-n-900">
            {card.name ?? clients('unnamed')}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {phone ? (
              <>
                <span className="text-body whitespace-nowrap text-n-900">{fmt.phone(phone)}</span>
                <Button variant="plain" size="s" iconOnly aria-label={clients('copy')} onClick={() => copy(phone)}>
                  <Copy aria-hidden />
                </Button>
                <Button asChild variant="secondary" size="s">
                  <a href={`tel:${phone}`}>
                    <Phone aria-hidden />
                    {t('call')}
                  </a>
                </Button>
              </>
            ) : (
              <span className="text-body text-n-600">{clients('noNumber')}</span>
            )}
            {card.account && (
              <Pill tone="neutral" size="m">
                {t('account')}
              </Pill>
            )}
          </div>
        </div>
        <ClientTagsInPlace slug={slug} card={card} manage={manage} />
        <dl className="m-0 flex flex-wrap gap-x-12 gap-y-3 max-sm:flex-col">
          {facts.map((f) => (
            <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-micro text-n-500">{f.label}</dt>
              <dd className="m-0 text-small text-n-900">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {manage && (
        <Button variant="tertiary" size="s" onClick={onEdit}>
          {t('change')}
        </Button>
      )}
    </div>
  )
}

/**
 * The tags in place (A8): each add or removal is saved at once as the card's whole tag list (a PATCH with `tags`
 * alone); a removal offers Undo for 5 s. The list is kept here between the saves, so two quick adds both land. The
 * suggestions are the tags of the business's 50 most recent clients by use — loaded only when the field opens.
 */
function ClientTagsInPlace({ slug, card, manage }: { slug: string; card: ClientCard; manage: boolean }) {
  const t = useTranslations('clientCard.tags')
  const sdk = useSdk()
  const errorText = useErrorText()
  const update = useMutation(sdk.clients.update(slug))
  const [tags, setTags] = useState(card.tags)
  const [open, setOpen] = useState(false)
  // a refetched card with other tags is the truth again
  const [base, setBase] = useState(card.tags)
  if (base.join('\n') !== card.tags.join('\n')) {
    setBase(card.tags)
    setTags(card.tags)
  }

  const recent = useInfiniteQuery({ ...sdk.clients.list(slug, { limit: 50 }), enabled: manage && open })
  const counts = new Map<string, number>()
  for (const row of recent.data?.pages[0]?.items ?? []) for (const tag of row.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  const suggestions = [...counts].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }))

  const save = (next: string[], undo?: string[]) => {
    setTags(next)
    update.mutate(
      { id: card.id, tags: next },
      {
        onSuccess: () => {
          if (undo) toast(t('removed'), { action: { label: t('undo'), onClick: () => save(undo) } })
        },
        onError: (error) => {
          setTags(card.tags)
          toast(errorText(error))
        },
      },
    )
  }

  return (
    <TagEditor
      aria-label={t('label')}
      value={tags}
      readOnly={!manage}
      maxLength={CLIENT_TAG_MAX}
      maxTags={CLIENT_TAGS_MAX}
      suggestions={suggestions}
      onOpenChange={setOpen}
      before={<ClientAutoTags phoneOnly={card.settings.phoneOnly} segments={card.segments} size="m" />}
      onAdd={(tag) => save([...tags, tag])}
      onRemove={(tag) =>
        save(
          tags.filter((x) => x !== tag),
          tags,
        )
      }
      labels={{
        add: t('add'),
        field: t('field'),
        addAnother: t('addAnother'),
        remove: (tag) => t('remove', { tag }),
        create: (text) => t('create', { text }),
        duplicate: t('duplicate'),
        tooLong: t('tooLong', { max: CLIENT_TAG_MAX }),
        suggestions: t('suggestions'),
      }}
    />
  )
}
