import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { SetupIncompleteDetails } from '@yeral/contract/errors'
import type { Setup } from '@yeral/contract/setup'
import { MARKET_LOCALES } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Callout } from '@yeral/ui/callout'
import { Checklist, type ChecklistItem } from '@yeral/ui/checklist'
import { SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { ArrowRight, Clock, FileText, Image, ImagePlus, Star } from 'lucide-react'
import { useId, useRef, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { PageLinkField, PageQrCard } from '@/shared/ui'
import { firstMissing, hasAbout, qualityOf, QUALITY_ITEMS, type QualityItem } from '../model/done'
import { StepHeader, type StepAction } from './setup-frame'

const QUALITY_ICON: Record<QualityItem, ReactNode> = { logo: <ImagePlus />, photos: <Image />, about: <FileText /> }

/** What the done step reads of the draft (`GET /v1/me/setup`). */
export type DoneDraft = Pick<Setup, 'slug' | 'name' | 'category' | 'address'>

/** Where finishing goes next: the calendar, or Settings to make the page stronger. */
export type AfterSetup = 'calendar' | 'settings'

/**
 * Step 8, «{name} is ready!» (B-Onboarding `isDone`, book B-06): the page is in review (only the team sees it, the
 * calendar works now); the card clients will see; the page link with Copy and Share and the QR card with its
 * downloads, as Settings → Link and QR shows them, saying they open after the review (the owner, 25.10.2026); «Make
 * your page stronger» (a logo, 3+ photos, an About). «Go to the calendar» finishes the setup
 * (`setup.finish`: the workspace joins the switcher and Ýeral's review) and opens the workspace's calendar; each
 * checklist «Add» finishes the same way into Settings. When finishing finds a step missing (`setup_incomplete`), the
 * wizard opens it. A hook, as the other steps are, so the wizard's frame stays one element; `on` while it shows.
 * `back`: the workspace someone came from («Create a business» from the switcher), named in the switcher note.
 * `onFinished` tells the wizard first, before the draft's refresh comes back empty, so it opens the workspace instead
 * of a new draft (whichever refresh gets there: the sdk's, the events feed's, another tab's).
 */
export function useDoneStep(
  draft: DoneDraft | null,
  on: boolean,
  back: string | null,
  onFinished: (slug: string, after: AfterSetup) => void,
): { body: ReactNode; action: StepAction; primary: { label: string; icon: ReactNode; finish: () => void } } {
  const t = useTranslations('setup.done')
  const tl = useTranslations('pageLink')
  const previewTitle = useId()
  const linkTitle = useId()
  const qrTitle = useId()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const slug = draft?.slug ?? ''
  const profile = useQuery({ ...sdk.settings.profile(slug), enabled: on && !!draft })
  const gallery = useQuery({ ...sdk.settings.gallery(slug), enabled: on && !!draft })
  // set at once (a re-render comes a tick later): a second press can't send a second finish
  const leaving = useRef<AfterSetup | null>(null)
  const options = sdk.setup.finish(slug)
  const finish = useMutation({
    ...options,
    onSuccess: async (...args) => {
      // the wizard hears it before any refresh finds the draft gone, and the draft is gone from the cache at once
      onFinished(slug, leaving.current ?? 'calendar')
      queryClient.setQueryData(sdk.setup.mine().queryKey, { setup: null })
      await options.onSuccess?.(...args)
    },
  })

  const leave = async (after: AfterSetup) => {
    if (leaving.current) return
    leaving.current = after
    try {
      await finish.mutateAsync()
    } catch (error) {
      leaving.current = null
      toast(errorText(error))
      const missing = isApiError(error, 'setup_incomplete') ? firstMissing((error.details as SetupIncompleteDetails).missing) : null
      if (missing) void navigate({ to: '/setup/$step', params: { step: missing } })
      // finished meanwhile (another tab) or gone: the draft is asked again, and the wizard follows what it finds
      else if (isApiError(error, 'invalid_status') || isApiError(error, 'not_found'))
        void queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
    }
  }
  const busy = finish.isPending || finish.isSuccess
  const primary = { label: t('toCalendar'), icon: <ArrowRight aria-hidden />, finish: () => void leave('calendar') }

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && draft && !profile.data && profile.isError) throw profile.error
  if (on && draft && !gallery.data && gallery.isError) throw gallery.error
  if (!on || !draft || !profile.data || !gallery.data)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      action: { valid: false, busy, ready: false, save: () => Promise.resolve(true) },
      primary,
    }

  const photos = gallery.data.items
  const quality = qualityOf({ logo: !!profile.data.logo, photos: photos.length, about: hasAbout(profile.data.about) })
  const city = draft.address?.city.name ?? ''
  const where = profile.data.hideExactAddress
    ? t('approxArea', { city })
    : draft.address
      ? t('addressLine', { line: draft.address.line, city })
      : city

  const items: ChecklistItem[] = QUALITY_ITEMS.map((item) => ({
    id: item,
    status: quality[item],
    icon: QUALITY_ICON[item],
    title: t(`quality.${item}`),
    caption: t(`quality.${item}Caption`),
    doneText: t('quality.added'),
    action: (
      <button
        type="button"
        aria-label={t(`quality.${item}Add`)}
        disabled={busy}
        onClick={() => void leave('settings')}
        className={`${textLink} shrink-0 text-small`}
      >
        {t('quality.add')}
      </button>
    ),
  }))

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="done" title={t('title', { name: draft.name })} lead={t('lead')} />
      <div className="flex flex-col gap-2">
        <Callout tone="warning" icon={<Clock />} live={false}>
          {t.rich('inReview', { b: (chunks) => <b>{chunks}</b> })}
        </Callout>
        {back ? <p className="m-0 text-dense text-n-600">{t('switcherNote', { name: back })}</p> : null}
      </div>

      <section aria-labelledby={previewTitle} className="flex flex-col gap-3">
        <SettingsSectionTitle as="h2" id={previewTitle}>
          {t('previewLabel')}
        </SettingsSectionTitle>
        <div className="flex w-full max-w-90 flex-col gap-3">
          {photos[0] ? (
            // decorative: the card's name is right under it
            <img src={photos[0].url} alt="" className="block aspect-4/3 w-full rounded-m object-cover" />
          ) : (
            // no photo yet: the card's place, as the client site keeps it for a business without one
            <div aria-hidden className="flex aspect-4/3 w-full items-center justify-center rounded-m bg-n-100 text-n-500">
              <Image className="size-8" />
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[17px] leading-[22px] font-semibold text-n-900">{draft.name}</span>
              <span className="text-dense text-n-600">{t('cardMeta', { category: draft.category, where })}</span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-n-900">
              <Star aria-hidden className="size-3.5 fill-n-900 stroke-none" />
              {t('new')}
            </span>
          </div>
        </div>
      </section>

      {/* the link and the QR as Settings → Link and QR shows them, saying they open after the review */}
      <section aria-labelledby={linkTitle} className="flex flex-col gap-5">
        <SettingsSectionTitle as="h2" id={linkTitle} caption={t('linkReady')}>
          {tl('title')}
        </SettingsSectionTitle>
        <PageLinkField slug={draft.slug} label={tl('title')} />
        {MARKET_LOCALES.length > 1 ? <p className="m-0 text-dense text-n-600">{tl('noLanguage')}</p> : null}
      </section>

      <section aria-labelledby={qrTitle} className="flex flex-col gap-5">
        <SettingsSectionTitle as="h2" id={qrTitle}>
          {tl('qrTitle')}
        </SettingsSectionTitle>
        <PageQrCard slug={draft.slug} name={draft.name} note={t('qrNote')} />
      </section>

      <Checklist
        titleAs="h2"
        title={t('quality.title')}
        countLabel={(done, total) => t('quality.count', { done, total })}
        doneLabel={t('quality.doneMark')}
        items={items}
      />
    </section>
  )

  return { body, action: { valid: true, busy, ready: true, save: () => Promise.resolve(true) }, primary }
}
