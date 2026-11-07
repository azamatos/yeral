import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { Pill } from '@yeral/ui/pill'
import { toast } from '@yeral/ui/toast'
import { ChevronLeft, Images, LayoutGrid, MapPin, Share2, Star } from 'lucide-react'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { StatusPill } from '@/entities/business'
import { site } from '@/shared/config'
import { addressLine } from '@/shared/lib'
import { FavouriteButton } from './favourite'
import { tabSearch } from './sections'

type Detail = BusinessDetail

/** Glass IconButtons on the photo (Venue v0.7 `.glass`): white 88 % with a 12 px blur, the icon ink. */
const glass = 'border-transparent bg-white/88 text-n-900 backdrop-blur-md hover:bg-n-0'
/** Plain IconButtons on the phone's white bar (Venue v0.7 `.pbar` `.ipl`): no box, the icon ink, a fill on hover. */
const plain = 'border-transparent text-n-900 hover:border-transparent hover:bg-n-100'

/** How far the phone's cover folds: 300 high, down to the 56 px bar (Venue v0.7 · C2 «Cover collapse»). */
const COVER = 300
const BAR = 56
const FOLD = COVER - BAR
/** The meta line is gone by 122, the bar forms from 160 to 244. */
const META_OUT = 122
const FORM_FROM = 160

const clamp = (n: number) => Math.min(1, Math.max(0, n))

/**
 * The phone's cover folding into the 56 px bar as the page scrolls (Venue v0.7 · C2 motion spec, the owner's #40): the
 * scroll position is the timeline, nothing but transform and opacity moves, so nothing re-lays out. The photo moves at
 * half the scroll and fades from 160 to 244 px; the meta line fades out over the first 122; the name (one element)
 * shrinks 28 → 16 and travels into the bar, turning ink as the bar fills white; the round photo grows in beside it.
 * With reduced motion the cover scrolls away as it is and the bar appears at once at 160. At 768 and wider nothing
 * folds. Runs after hydration only, so the server's page and the first render agree.
 */
function useCoverFold(coverRef: RefObject<HTMLDivElement | null>, on: boolean) {
  useEffect(() => {
    const cover = coverRef.current
    const root = cover?.parentElement
    const q = (part: string) => root?.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? null
    const [photo, meta, title, name, ink, round, fill, more] = ['photo', 'meta', 'title', 'name', 'ink', 'round', 'fill', 'more'].map(q)
    if (!on || !cover || !photo || !meta || !title || !name || !ink || !round || !fill) return
    const moved = [photo, meta, title, name, ink, round, fill, more]
    const phone = matchMedia('(max-width: 767px)')
    const still = matchMedia('(prefers-reduced-motion: reduce)')
    let start = { x: 16, y: 148 }
    let frame = 0
    const measure = () => {
      const c = cover.getBoundingClientRect()
      const t = title.getBoundingClientRect()
      start = { x: t.left - c.left, y: t.top - c.top }
    }
    const apply = () => {
      frame = 0
      if (!phone.matches) {
        for (const el of moved) el?.style.removeProperty('opacity')
        for (const el of moved) el?.style.removeProperty('transform')
        return
      }
      const s = Math.min(FOLD, Math.max(0, -cover.getBoundingClientRect().top))
      const calm = still.matches
      const form = calm ? (s >= FORM_FROM ? 1 : 0) : clamp((s - FORM_FROM) / (FOLD - FORM_FROM))
      const p = calm ? form : s / FOLD
      const k = 1 - (1 - 16 / 28) * p
      // the name ends after Back and the round photo (4 + 40 + 4 + 32 + 8), centred in the bar
      const end = { x: 88, y: (BAR - 32 * (16 / 28)) / 2 }
      photo.style.transform = calm ? '' : `translateY(${s / 2}px)`
      photo.style.opacity = calm ? '' : String(1 - form)
      meta.style.opacity = calm ? '' : String(1 - clamp(s / META_OUT))
      title.style.opacity = calm ? '' : '0'
      name.style.opacity = calm ? String(form) : '1'
      name.style.transform = `translate(${start.x + (end.x - start.x) * p}px, ${start.y + (end.y - start.y) * p}px) scale(${k})`
      ink.style.opacity = String(form)
      round.style.opacity = String(form)
      round.style.transform = `scale(${0.6 + 0.4 * form})`
      fill.style.opacity = String(form)
      if (more) more.style.opacity = s >= FORM_FROM ? '0' : ''
    }
    const update = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }
    const resize = () => {
      measure()
      update()
    }
    measure()
    apply()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', resize, { passive: true })
    phone.addEventListener('change', resize)
    still.addEventListener('change', update)
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', update)
      removeEventListener('resize', resize)
      phone.removeEventListener('change', resize)
      still.removeEventListener('change', update)
    }
  }, [coverRef, on])
}

/**
 * The hero (Venue v0.7 · C2, option B «Cover», the owner's #40): one wide photo with the name, rating, StatusPill and
 * address on a fixed gradient (white text stays ≥ 4.5 : 1 on any photo), Favourite and Share as glass buttons, photos
 * 2–5 as thumbnails with «All photos» on the last. On phones the site header gives way to the cover: 300 high, with
 * Back among the round buttons, it folds into a 56 px bar with Back, the round photo and the name as the page scrolls
 * (`useCoverFold`). No photos: the initial tile and the name on white; on the phone the same 56 px bar from the start
 * (the folded one, Back, the initial and the name), the rest of the identity under it. Returns the bar and the cover
 * side by side, so the bar can stick for the whole page.
 */
export function Hero({ detail }: { detail: Detail }) {
  const cover = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<number | null>(null)
  const t = useTranslations('business')
  const [first, ...rest] = detail.photos
  useCoverFold(cover, Boolean(first))
  const actions = (className?: string) => (
    <>
      {/* the owner's page in review isn't public: nothing to keep among favourites */}
      {!detail.preview && <FavouriteButton slug={detail.slug} className={className} />}
      <ShareButton name={detail.name} slug={detail.slug} className={className} />
    </>
  )
  if (!first)
    return (
      <>
        {/* the phone's bar as the cover's folded one (Venue v0.7 `.pbar`): Back, the initial, the name, plain buttons */}
        <div className="sticky top-0 z-20 -mx-4 flex h-14 items-center gap-1 bg-n-0 px-1 sm:hidden">
          <BackButton />
          <span aria-hidden className="mr-2 grid size-8 flex-none place-items-center rounded-pill bg-a-50 text-small font-bold text-a-600">
            {Array.from(detail.name)[0]}
          </span>
          <h1 className="m-0 min-w-0 flex-1 truncate text-[16px] leading-6 font-semibold text-n-900">{detail.name}</h1>
          {actions(plain)}
        </div>
        <div className="flex items-start gap-6 pt-4 max-md:flex-col max-md:gap-4 max-md:pt-6 max-sm:pt-4">
          <span
            aria-hidden
            className="grid size-16 flex-none place-items-center rounded-card bg-a-50 text-[28px] leading-8 font-bold text-a-600 max-sm:hidden"
          >
            {Array.from(detail.name)[0]}
          </span>
          <Identity detail={detail} onPhoto={false} nameInBar />
          <div className="flex flex-none gap-2 max-sm:hidden md:ml-auto md:pt-2">{actions()}</div>
        </div>
      </>
    )
  const thumbs = rest.slice(0, 4)
  return (
    <>
      {/* the phone's bar (sticky over the cover; at 768 and wider only the buttons, over the cover's corner) */}
      <div className="pointer-events-none sticky top-0 z-20 -mb-14 h-14 max-md:-mx-6 max-sm:-mx-4 md:relative md:mt-4 md:-mb-15 md:h-15">
        <span data-part="fill" aria-hidden className="absolute inset-0 bg-n-0 opacity-0 md:hidden" />
        <div className="pointer-events-auto absolute top-2 left-3 sm:hidden">
          <BackButton className={cn(glass, 'rounded-pill')} />
        </div>
        <img
          data-part="round"
          src={first.url}
          alt=""
          className="absolute top-3 left-12 size-8 rounded-pill object-cover opacity-0 md:hidden"
        />
        <span
          data-part="name"
          aria-hidden
          className="absolute top-0 left-0 w-[calc(100vw-32px)] origin-top-left truncate text-[28px] leading-8 font-bold tracking-[-0.02em] text-white opacity-0 md:hidden"
        >
          {detail.name}
          <span data-part="ink" className="absolute inset-0 truncate text-n-900 opacity-0">
            {detail.name}
          </span>
        </span>
        <div className="pointer-events-auto absolute top-2 right-3 flex gap-2 md:top-5 md:right-5">
          {detail.photos.length > 1 && (
            <Button
              data-part="more"
              variant="secondary"
              aria-label={t('photos.open', { count: detail.photos.length })}
              className={cn(glass, 'gap-1.5 rounded-pill px-3 md:hidden')}
              onClick={() => setViewer(0)}
            >
              <Images aria-hidden />
              {detail.photos.length}
            </Button>
          )}
          {actions(cn(glass, 'max-md:rounded-pill'))}
        </div>
      </div>
      <div
        ref={cover}
        className="relative h-105 overflow-hidden rounded-[20px] bg-n-900 max-md:-mx-6 max-md:h-75 max-md:rounded-none max-md:bg-n-0 max-sm:-mx-4"
      >
        <div data-part="photo" className="absolute inset-0">
          <img src={first.url} alt={first.alt} className="size-full object-cover object-[50%_36%] max-md:object-[50%_30%]" />
          {/* fixed stops: clear above the name, 80 % ink at the foot (the phone adds a little at the top for the buttons) */}
          <span
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,16,20,0)_28%,rgba(16,16,20,.28)_56%,rgba(16,16,20,.8)_100%)] max-md:bg-[linear-gradient(180deg,rgba(16,16,20,.18)_0%,rgba(16,16,20,0)_24%,rgba(16,16,20,.3)_52%,rgba(16,16,20,.82)_100%)]"
          />
        </div>
        <div className="absolute bottom-7 left-8 z-2 flex max-w-180 flex-col gap-3 max-md:inset-x-4 max-md:bottom-4 max-md:max-w-none max-md:gap-2">
          <Identity detail={detail} onPhoto />
        </div>
        {thumbs.length > 0 && (
          <div className="absolute right-6 bottom-7 z-2 flex gap-2 max-md:hidden">
            {thumbs.map((p, i) => {
              const all = i === thumbs.length - 1 && detail.photos.length >= 5
              return (
                <button
                  key={p.url}
                  type="button"
                  aria-label={
                    all ? t('photos.open', { count: detail.photos.length }) : t('photoCount', { n: i + 2, total: detail.photos.length })
                  }
                  className="relative h-16 w-22 flex-none cursor-pointer overflow-hidden rounded-[10px] border-0 bg-n-900 p-0 shadow-[0_0_0_2px_rgba(255,255,255,.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-a-400"
                  onClick={() => setViewer(i + 1)}
                >
                  <img src={p.url} alt="" loading="lazy" className="size-full object-cover" />
                  {all && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-n-900/55 text-[12px] leading-4 font-semibold text-white">
                      <LayoutGrid aria-hidden className="size-4" strokeWidth={1.75} />
                      {t('photos.all')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <PhotosViewer photos={detail.photos} name={detail.name} at={viewer} onClose={() => setViewer(null)} />
    </>
  )
}

/**
 * Back on the phone's bar (Venue v0.7 · C2, the 390 cover: the site header is gone there): the page before, or Home
 * when this page was the first one opened (a shared link).
 */
function BackButton({ className }: { className?: string }) {
  const t = useTranslations('business')
  const lang = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  return (
    <Button
      variant="secondary"
      iconOnly
      aria-label={t('back')}
      className={cn(plain, className)}
      onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/$lang', params: { lang } }))}
    >
      <ChevronLeft aria-hidden />
    </Button>
  )
}

/**
 * The identity (Venue v0.7 `.idn`): the name (44/48, two lines at most; 28/32 on one line on phones), «★ 4.9 · 96
 * reviews» (the count opens the Reviews tab), the StatusPill, the address with its distance. White on the photo, ink on
 * white. Phones add the category to the meta line (no breadcrumbs there) and give the pill its own line; with the name
 * in the phone's bar (no photos), it's left out here on the phone.
 */
function Identity({ detail, onPhoto, nameInBar = false }: { detail: Detail; onPhoto: boolean; nameInBar?: boolean }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const lang = useLocale()
  const link = onPhoto
    ? 'text-white underline decoration-white/55 decoration-1 underline-offset-3 hover:decoration-white'
    : 'text-n-900 underline decoration-n-300 decoration-1 underline-offset-3 hover:decoration-n-900'
  const divider = cn('h-4 w-px flex-none', onPhoto ? 'bg-white/40' : 'bg-n-200')
  return (
    <>
      <h1
        data-part={onPhoto ? 'title' : undefined}
        title={detail.name}
        className={cn(
          'm-0 line-clamp-2 text-[44px] leading-12 font-bold tracking-[-0.025em] max-md:line-clamp-1 max-md:text-[28px] max-md:leading-8 max-md:tracking-[-0.02em] max-[559px]:text-[32px] max-[559px]:leading-9',
          onPhoto ? 'text-white' : 'text-n-900',
          nameInBar && 'max-sm:hidden',
        )}
      >
        {detail.name}
      </h1>
      <div data-part={onPhoto ? 'meta' : undefined} className="flex flex-col gap-3 max-md:gap-2">
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-3.5 gap-y-2 text-[15px] leading-5.5 max-md:gap-x-3 max-md:text-dense',
            onPhoto ? 'text-white' : 'text-n-600',
          )}
        >
          {detail.rating !== null && detail.reviewsCount > 0 ? (
            <>
              <span className={cn('inline-flex items-center gap-1.5 font-semibold', !onPhoto && 'text-n-900')}>
                <Star aria-hidden className="size-4 fill-current" strokeWidth={1.75} />
                {fmt.rating(detail.rating)}
              </span>
              <span aria-hidden className="-ml-2">
                ·
              </span>
              <Link to="." search={tabSearch('reviews')} replace resetScroll={false} className={link}>
                {t('reviews', { count: detail.reviewsCount })}
              </Link>
            </>
          ) : (
            <span>{t('noReviews')}</span>
          )}
          <i aria-hidden className={cn(divider, 'md:hidden')} />
          <Link to="/$lang/c/$category" params={{ lang, category: detail.category.id }} className={cn(link, 'md:hidden')}>
            {detail.category.name}
          </Link>
          <i aria-hidden className={cn(divider, 'max-md:hidden')} />
          <span className="flex max-md:basis-full">
            <StatusPill open={detail.open} />
          </span>
        </div>
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-5.5 max-md:items-start max-md:gap-x-1.5 max-md:text-[13px] max-md:leading-4.5',
            onPhoto ? 'text-white/90' : 'text-n-600',
          )}
        >
          <MapPin aria-hidden className="size-4 flex-none max-md:mt-px" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 md:flex-none">
            {addressLine(detail, fmt)}
            {detail.distanceM !== null && ` · ${fmt.distance(detail.distanceM)}`}
          </span>
          {/* the api sends when it moved only for the 30 days the page says so (book Q-215) */}
          {detail.movedAt !== null && <Pill tone="accent">{t('newAddress')}</Pill>}
        </div>
        {detail.hideExactAddress && <span className={cn('text-dense', onPhoto ? 'text-white/90' : 'text-n-600')}>{t('approximate')}</span>}
      </div>
    </>
  )
}

/** All the photos, one under another, in a modal (bottom sheet on phones), scrolled to the one pressed. */
function PhotosViewer({ photos, name, at, onClose }: { photos: Detail['photos']; name: string; at: number | null; onClose: () => void }) {
  const t = useTranslations('business.photos')
  return (
    <Modal open={at !== null} onOpenChange={(open) => !open && onClose()}>
      {at !== null && (
        <ModalContent size={640} aria-describedby={undefined}>
          <ModalHeader title={t('title', { name })} closeLabel={t('close')} />
          <div className="flex flex-col gap-2">
            {photos.map((p, i) => (
              <img
                key={p.url}
                src={p.url}
                alt={p.alt}
                ref={i === at && i > 0 ? (el) => el?.scrollIntoView({ block: 'start' }) : undefined}
                className="w-full rounded-ctl-s object-cover"
              />
            ))}
          </div>
        </ModalContent>
      )}
    </Modal>
  )
}

/**
 * Share (Venue): the phone's share sheet where there is one, else the link copied, with a toast; a sheet closed by the
 * person is no error, and anything that fails says so.
 */
function ShareButton({ name, slug, className }: { name: string; slug: string; className?: string }) {
  const t = useTranslations('business.share')
  const lang = useLocale()
  const share = async () => {
    const url = `${site.urls.client}/${lang}/b/${slug}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast(t('copied'))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast.error(t('failed'))
    }
  }
  return (
    <Button variant="secondary" iconOnly aria-label={t('label')} className={className} onClick={() => void share()}>
      <Share2 aria-hidden />
    </Button>
  )
}
