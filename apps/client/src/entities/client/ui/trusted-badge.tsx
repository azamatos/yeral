import type { TrustedStandingView } from '@yeral/contract/account'
import { TRUSTED_MIN_VISITS } from '@yeral/domain/clients'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Check, Info, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/**
 * «Trusted» as the client sees it (C7-Booking D2, design v0.7 · D): a 24-high badge in the completed tones — white,
 * 1px line, ink 12/16 600, shield-check 12 — under the name in Account and beside it on the confirm step; the tooltip
 * says what it means.
 */
export function TrustedBadge({ className }: { className?: string }) {
  const t = useTranslations('account')
  return (
    <span
      title={t('trustedTip', { n: TRUSTED_MIN_VISITS })}
      className={cn(
        'inline-flex h-6 flex-none items-center gap-1 rounded-pill border border-st-completed-line bg-n-0 px-2 text-micro font-semibold whitespace-nowrap text-st-completed-ink',
        className,
      )}
    >
      <ShieldCheck aria-hidden strokeWidth={1.75} className="size-3" />
      {t('trusted')}
    </span>
  )
}

/**
 * The explainer card on top of Profile (C7-Booking D2 `.trc`): the mark and what it gives; «2 more visits…» with a
 * five-step bar; «Trusted is paused» since a missed booking, the bar counting the visits after it.
 */
export function TrustedCard({ standing, className }: { standing: TrustedStandingView; className?: string }) {
  const t = useTranslations('trusted')
  const tc = useTranslations('common')
  const fmt = useFmt()
  const trusted = standing.state === 'trusted'
  const bar = standing.state !== 'trusted' && (
    <div role="img" aria-label={t('progress', { visits: standing.visits, max: TRUSTED_MIN_VISITS })} className="grid grid-cols-5 gap-1">
      {Array.from({ length: TRUSTED_MIN_VISITS }, (_, i) => (
        <i key={i} className={cn('h-1.5 rounded-[3px]', i < standing.visits ? 'bg-st-completed-dot' : 'bg-n-200')} />
      ))}
    </div>
  )
  return (
    <section
      aria-label={t(trusted ? 'title' : standing.state === 'paused' ? 'pausedTitle' : 'almostTitle', {
        n: TRUSTED_MIN_VISITS - standing.visits,
      })}
      className={cn('flex flex-col gap-4 rounded-card border border-n-200 bg-n-0 px-6 pt-5 pb-6', className)}
    >
      <div className="flex items-center gap-4">
        <span
          className={cn(
            'rounded-m flex size-12 flex-none items-center justify-center',
            trusted ? 'bg-st-completed-bg text-st-completed-ink' : 'bg-n-100 text-n-600',
          )}
        >
          <ShieldCheck aria-hidden strokeWidth={1.75} className="size-6" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 className="m-0 text-[17px] leading-6 font-semibold text-n-900">
            {trusted
              ? t('title')
              : standing.state === 'paused'
                ? t('pausedTitle')
                : t('almostTitle', { n: TRUSTED_MIN_VISITS - standing.visits })}
          </h2>
          <p className="m-0 text-small text-n-600">
            {trusted
              ? t('visits', { count: standing.visits, brand: tc('brand') })
              : standing.state === 'paused' && standing.pausedSince
                ? t('pausedSub', { date: fmt.shortDate(standing.pausedSince) })
                : t('almostSub', { visits: standing.visits, max: TRUSTED_MIN_VISITS })}
          </p>
        </div>
      </div>
      {bar}
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {trusted ? (
          <>
            <Line check>{t('seen')}</Line>
            <Line check>{t('atOnce')}</Line>
            <Line check>{t('stays')}</Line>
          </>
        ) : (
          <Line>{standing.state === 'paused' ? t('pausedNote', { max: TRUSTED_MIN_VISITS }) : t('almostNote')}</Line>
        )}
      </ul>
    </section>
  )
}

/** One line of the card (`.trl li`): a green check for what the mark gives, a grey ⓘ for what's still to come. */
function Line({ check, children }: { check?: boolean; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-small [text-wrap:pretty] text-n-900">
      {check ? (
        <Check aria-hidden strokeWidth={2.25} className="mt-0.5 size-4 flex-none text-st-completed-ink" />
      ) : (
        <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 flex-none text-n-600" />
      )}
      <span>{children}</span>
    </li>
  )
}
