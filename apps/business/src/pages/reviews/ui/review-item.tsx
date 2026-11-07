import { useMutation } from '@tanstack/react-query'
import type { TeamReview } from '@yeral/contract/reviews'
import { ago } from '@yeral/domain/time'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Pill } from '@yeral/ui/pill'
import { Quote } from '@yeral/ui/quote'
import { Stars } from '@yeral/ui/rating'
import { toast } from '@yeral/ui/toast'
import { Clock, Ellipsis, Flag, Reply, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { ReplyComposer } from './reply-composer'

const LINK_BUTTON =
  'inline-flex h-8 items-center rounded-ctl-s px-2 text-dense font-semibold whitespace-nowrap focus-visible:shadow-focus focus-visible:outline-none'

/** «Today», «Yesterday», «2 weeks ago». */
export function useWhen() {
  const t = useTranslations('reviews.when')
  const now = useClock()
  return (at: number) => {
    const when = ago(at, now)
    return t(when.unit, { count: when.count })
  }
}

/**
 * One review (B-Reviews → ReviewItem; DS-Business 06): the avatar, the saved client name with how long ago, the stars
 * with «service · specialist», the words (or none: stars only), Ýeral's moderation line once it was reported, the
 * business's reply with Change and Delete, or the Reply button and the composer. A specialist reads it as it is.
 */
export function ReviewItem({
  slug,
  business,
  review: r,
  manage,
  onReport,
}: {
  slug: string
  business: string
  review: TeamReview
  /** The owner and administrators reply, change and delete replies, and report. */
  manage: boolean
  onReport: () => void
}) {
  const t = useTranslations('reviews')
  const brand = useTranslations('common')('brand')
  const sdk = useSdk()
  const errorText = useErrorText()
  const when = useWhen()
  const now = useClock()
  const headingId = useId()
  const [composing, setComposing] = useState(false)
  const reply = useMutation(sdk.reviews.reply(slug))
  const remove = useMutation(sdk.reviews.deleteReply(slug))
  // the composer closed or the reply went: the focus moves to the button that takes its place (Change over the
  // reply, or Reply), once the refreshed review renders it
  const focusNext = useRef<'reply' | 'change' | null>(null)
  const replyButton = useRef<HTMLButtonElement>(null)
  const changeButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (composing || !focusNext.current) return
    const target = focusNext.current === 'change' ? changeButton.current : replyButton.current
    if (!target) return
    focusNext.current = null
    target.focus()
  })
  const close = () => {
    focusNext.current = r.reply ? 'change' : 'reply'
    setComposing(false)
  }

  const post = (text: string) => {
    const editing = !!r.reply
    reply.mutate(
      { id: r.id, text },
      {
        onSuccess: () => {
          focusNext.current = 'change'
          setComposing(false)
          toast(editing ? t('toast.updated') : t('toast.posted'))
        },
        onError: (error) => toast.error(errorText(error)),
      },
    )
  }
  const del = () => {
    const old = r.reply?.text
    if (!old) return
    remove.mutate(r.id, {
      onSuccess: () => {
        focusNext.current = 'reply'
        toast(t('toast.deleted'), {
          action: {
            label: t('toast.undo'),
            onClick: () => reply.mutate({ id: r.id, text: old }, { onError: (error) => toast.error(errorText(error)) }),
          },
        })
      },
      onError: (error) => toast.error(errorText(error)),
    })
  }

  const replyWhen = r.reply ? (now - r.reply.at < 60_000 ? t('item.justNow') : when(r.reply.at)) : ''
  const report = r.report
  const moderation =
    report &&
    (report.state === 'checking'
      ? {
          tone: 'warning' as const,
          icon: <ShieldAlert aria-hidden />,
          text: t('moderation.checking', { brand }),
          hint: t('moderation.reason', { reason: t(`reasons.${report.reason}`) }),
        }
      : report.state === 'cleared'
        ? {
            tone: 'neutral' as const,
            icon: <ShieldCheck aria-hidden />,
            text: t('moderation.cleared', { brand }),
            hint: t('moderation.clearedHint'),
          }
        : { tone: 'neutral' as const, icon: <Clock aria-hidden />, text: t('moderation.noDecision'), hint: t('moderation.noDecisionHint') })

  return (
    <article aria-labelledby={headingId} className="flex gap-3 border-b border-n-200 py-5 sm:gap-3.5">
      <Avatar name={r.author} size={40} tone="neutral" decorative className="text-[15px] font-bold text-n-900" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span id={headingId} className="text-body font-semibold text-n-900">
              {r.author}
              <span className="text-dense font-normal text-n-600"> · {when(r.createdAt)}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <Stars rating={r.rating} size={14} label={t('stars', { rating: r.rating })} />
              <span className="text-dense text-n-600">{r.what}</span>
            </span>
          </div>
          {manage && !report && (
            <Menu>
              <MenuTrigger asChild>
                <Button variant="plain" size="s" iconOnly aria-label={t('item.actions', { name: r.author })}>
                  <Ellipsis aria-hidden />
                </Button>
              </MenuTrigger>
              <MenuContent align="end" className="w-65">
                <MenuItem onSelect={onReport} className="items-start">
                  <Flag aria-hidden className="mt-0.5 size-4 flex-none" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{t('item.report')}</span>
                    <span className="text-micro text-n-600">{t('item.reportHint')}</span>
                  </span>
                </MenuItem>
              </MenuContent>
            </Menu>
          )}
        </div>
        {r.text && <p className="m-0 max-w-[680px] text-body text-pretty text-n-900">{r.text}</p>}
        {moderation && (
          <div className="flex max-w-[680px] flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <Pill
              tone={moderation.tone}
              size="l"
              icon={moderation.icon}
              className="h-auto min-h-7 flex-initial py-1 text-left whitespace-normal"
            >
              {moderation.text}
            </Pill>
            <span className="text-dense text-n-600">{moderation.hint}</span>
          </div>
        )}
        {r.reply && !composing && (
          <Quote
            className="max-w-[680px]"
            meta={
              <>
                <span className="font-semibold text-n-900">{r.reply.by ? `${business} · ${r.reply.by}` : business}</span>
                <span className="text-n-600">{replyWhen}</span>
                {manage && (
                  <span className="ml-auto flex items-center gap-1">
                    <button
                      ref={changeButton}
                      type="button"
                      aria-label={t('item.changeTo', { name: r.author })}
                      className={cn(LINK_BUTTON, 'text-a-600')}
                      onClick={() => setComposing(true)}
                    >
                      {t('item.change')}
                    </button>
                    <button
                      type="button"
                      aria-label={t('item.deleteTo', { name: r.author })}
                      className={cn(LINK_BUTTON, 'text-danger-ink')}
                      disabled={remove.isPending}
                      onClick={del}
                    >
                      {t('item.delete')}
                    </button>
                  </span>
                )}
              </>
            }
          >
            {r.reply.text}
          </Quote>
        )}
        {manage && !r.reply && !composing && (
          <div>
            <Button
              ref={replyButton}
              variant="secondary"
              size="s"
              aria-label={t('item.replyTo', { name: r.author })}
              onClick={() => setComposing(true)}
            >
              <Reply aria-hidden />
              {t('item.reply')}
            </Button>
          </div>
        )}
        {composing && (
          <ReplyComposer
            business={business}
            initial={r.reply?.text ?? ''}
            placeholder={
              r.rating >= 4 ? t('composer.placeholderGood', { name: r.author.split(' ')[0] ?? r.author }) : t('composer.placeholderLow')
            }
            saving={reply.isPending}
            onCancel={close}
            onSubmit={post}
          />
        )}
      </div>
    </article>
  )
}
