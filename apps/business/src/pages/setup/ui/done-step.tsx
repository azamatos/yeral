import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { SetupIncompleteDetails } from '@yeral/contract/errors'
import { isApiError } from '@yeral/sdk'
import { Callout } from '@yeral/ui/callout'
import { Checklist, type ChecklistItem } from '@yeral/ui/checklist'
import { CopyField } from '@yeral/ui/copy-field'
import { QrBlock } from '@yeral/ui/qr-block'
import { Spinner } from '@yeral/ui/spinner'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { ArrowRight, Clock, FileText, Image, ImagePlus, Star } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { site } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { firstMissing, hasAbout, qualityOf, QUALITY_ITEMS, shareLinks, type QualityItem } from '../model/done'
import { StepHeader, type StepAction } from './setup-frame'

/** The client site's host as people read it («yeral.app»), from the site config. */
const clientHost = new URL(site.urls.client).host

const QUALITY_ICON: Record<QualityItem, ReactNode> = { logo: <ImagePlus />, photos: <Image />, about: <FileText /> }

/** What the done step reads of the draft. */
export type DoneDraft = {
  slug: string
  name: string
  category: string
  address: { line: string; city: { name: string } } | null
}

/** Where finishing goes next: the calendar, or Settings to make the page stronger. */
type After = 'calendar' | 'settings'

/**
 * Step 8, «{name} is ready!» (B-Onboarding `isDone`, book B-06): the page is in review (only the team sees it, the
 * calendar works now); the card clients will see; the page link with Copy and Share and the QR code with its
 * downloads; «Make your page stronger» (a logo, 3+ photos, an About). «Go to the calendar» finishes the setup
 * (`setup.finish`: the workspace joins the switcher and Ýeral's review) and opens the workspace's calendar; each
 * checklist «Add» finishes the same way into Settings. When finishing finds a step missing (`setup_incomplete`), the
 * wizard opens it. A hook, as the other steps are, so the wizard's frame stays one element; `on` while it shows.
 * `back`: the workspace someone came from («Create a business» from the switcher), named in the switcher note.
 */
export function useDoneStep(
  draft: DoneDraft | null,
  on: boolean,
  back: string | null,
): { body: ReactNode; action: StepAction; primary: { label: string; icon: ReactNode; finish: () => void } } {
  const t = useTranslations('setup.done')
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const slug = draft?.slug ?? ''
  const profile = useQuery({ ...sdk.settings.profile(slug), enabled: on && !!draft })
  const gallery = useQuery({ ...sdk.settings.gallery(slug), enabled: on && !!draft })
  // the draft is gone once it's finished: the wizard would open a new one, so its data is refreshed only after the
  // person has left it for the workspace
  const finish = useMutation({ ...sdk.setup.finish(slug), onSuccess: undefined })
  const [leaving, setLeaving] = useState(false)

  const leave = async (after: After) => {
    if (finish.isPending || leaving) return
    try {
      await finish.mutateAsync()
    } catch (error) {
      toast(errorText(error))
      const missing = isApiError(error, 'setup_incomplete') ? firstMissing((error.details as SetupIncompleteDetails).missing) : null
      if (missing) void navigate({ to: '/setup/$step', params: { step: missing } })
      return
    }
    setLeaving(true)
    await navigate({ to: after === 'calendar' ? '/w/$slug/calendar' : '/w/$slug/settings', params: { slug } })
    for (const queryKey of [sdk.setup.mine().queryKey, sdk.team.workspaces().queryKey, sdk.me.get().queryKey])
      void queryClient.invalidateQueries({ queryKey })
  }
  const busy = finish.isPending || leaving
  const primary = { label: t('toCalendar'), icon: <ArrowRight aria-hidden />, finish: () => void leave('calendar') }

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && draft && !profile.data && profile.isError) throw profile.error
  if (!on || !draft || !profile.data || (!gallery.data && !gallery.isError))
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      action: { valid: false, busy, ready: false, save: () => Promise.resolve(true) },
      primary,
    }

  const photos = gallery.data?.items ?? []
  const quality = qualityOf({ logo: !!profile.data.logo, photos: photos.length, about: hasAbout(profile.data.about) })
  const city = draft.address?.city.name ?? ''
  const where = profile.data.hideExactAddress ? t('approxArea', { city }) : draft.address ? `${draft.address.line}, ${city}` : city
  const url = `${site.urls.client}/b/${draft.slug}`
  const share = shareLinks(url)

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

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] items-start gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-label text-n-500 uppercase">{t('previewLabel')}</span>
          {photos[0] ? (
            <img src={photos[0].url} alt={draft.name} className="block aspect-4/3 w-full rounded-m object-cover" />
          ) : (
            // no photo yet: the card's place, as the client site keeps it for a business without one
            <div aria-hidden className="flex aspect-4/3 w-full items-center justify-center rounded-m bg-n-100 text-n-500">
              <Image className="size-8" />
            </div>
          )}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[17px] leading-[22px] font-semibold text-n-900">{draft.name}</span>
              <span className="text-dense text-n-600">{`${draft.category} · ${where}`}</span>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-n-900">
              <Star aria-hidden className="size-3.5 fill-n-900 stroke-none" />
              {t('new')}
            </span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-label text-n-500 uppercase">{t('linkLabel')}</span>
          <span className="text-body font-semibold text-n-900">{t('linkReady')}</span>
          <CopyField
            value={url}
            display={`${clientHost}/b/${draft.slug}`}
            label={t('pageLink')}
            copy={{ copy: t('copy'), copied: t('copied') }}
            share={{
              label: t('share'),
              targets: [
                { id: 'whatsapp', label: t('whatsapp'), href: share.whatsapp },
                { id: 'telegram', label: t('telegram'), href: share.telegram },
              ],
            }}
          />
          <QrBlock
            variant="compact"
            value={url}
            label={t('qrLabel', { name: draft.name })}
            fileName={`${draft.slug}-qr`}
            caption={t('qrNote')}
            copy={{
              downloadPng: t('downloadPng'),
              downloadSvg: t('downloadSvg'),
              downloaded: (format) => t('downloaded', { format }),
            }}
            className="pt-1"
          />
        </div>
      </div>

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
