import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { AdminBusiness } from '@yeral/contract/admin'
import { formatPhone } from '@yeral/domain/phone'
import { BackLink } from '@yeral/ui/back-link'
import { Callout } from '@yeral/ui/callout'
import { EmptyState } from '@yeral/ui/empty-state'
import { KeyValueList, type KeyValueItem } from '@yeral/ui/key-value'
import { MapDot, MapFrame, MapMarker, MapPin } from '@yeral/ui/map-frame'
import { SectionHeader } from '@yeral/ui/section-header'
import { Skeleton } from '@yeral/ui/skeleton'
import { Building2 } from 'lucide-react'
import { useFormatter, useTranslations } from 'use-intl'
import { BusinessStateBadge, businessState } from '@/entities/business'
import { useSdk } from '@/shared/api'
import { site } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { TeamPage } from '@/widgets/team-shell'
import { BusinessActions } from './business-actions'

const STAMP = { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } as const

/** `/businesses/$id`: what the team checks before a verdict (Q-276): the name, the address on the map, the category, the logo and photos. */
export function BusinessPage({ id }: { id: string }) {
  const t = useTranslations('business')
  const sdk = useSdk()
  const errorText = useErrorText()
  const business = useQuery(sdk.admin.business(id))
  const back = (
    <BackLink asChild>
      <Link to="/businesses">{t('back')}</Link>
    </BackLink>
  )
  if (business.error)
    return (
      <TeamPage title={t('title')} back={back}>
        <EmptyState icon={<Building2 />} title={errorText(business.error)} />
      </TeamPage>
    )
  if (!business.data)
    return (
      <TeamPage title={t('title')} back={back}>
        <Skeleton className="h-96" />
      </TeamPage>
    )
  const b = business.data
  return (
    <TeamPage title={b.name} back={back} actions={<BusinessStateBadge state={businessState(b)} />}>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Notes business={b} />
          <Facts business={b} />
          <MapFrame center={b.location} zoom={16} interactive={false} className="h-64 rounded-m">
            <MapMarker at={b.location}>
              <MapPin hot className="-translate-y-2.5">
                {b.name}
              </MapPin>
              <MapDot />
            </MapMarker>
          </MapFrame>
          <Pictures business={b} />
        </div>
        <aside className="flex flex-col gap-6">
          <BusinessActions business={b} />
          <History business={b} />
        </aside>
      </div>
    </TeamPage>
  )
}

function Notes({ business: b }: { business: AdminBusiness }) {
  const t = useTranslations('business')
  const format = useFormatter()
  return (
    <>
      {b.reason && <Callout tone="danger">{t('noteRejected', { reason: b.reason })}</Callout>}
      {b.hidden && <Callout tone="danger">{t('noteHidden', { reason: b.hidden.reason })}</Callout>}
      {b.closed && <Callout tone="neutral">{t('noteClosed', { reason: b.closed.reason })}</Callout>}
      {b.addressChangedAt && <Callout tone="warning">{t('noteMoved', { when: format.dateTime(b.addressChangedAt, STAMP) })}</Callout>}
    </>
  )
}

function Facts({ business: b }: { business: AdminBusiness }) {
  const t = useTranslations()
  const nothing = { value: t('business.nothing'), muted: true }
  const facts: KeyValueItem[] = [
    { key: t('business.category'), value: b.category.name },
    { key: t('business.address'), value: t('fmt.addressInCity', { address: b.address, city: b.city.name }) },
    { key: t('business.floor'), ...(b.floor ? { value: b.floor } : nothing) },
    { key: t('business.entrance'), ...(b.entranceNote ? { value: b.entranceNote } : nothing) },
    { key: t('business.phone'), value: formatPhone(b.phone) },
    {
      key: t('business.owner'),
      ...(b.owner ? { value: `${b.owner.name ?? t('businesses.noOwnerName')} · ${formatPhone(b.owner.phone)}` } : nothing),
    },
    {
      key: t('business.page'),
      value: (
        <a href={`${site.urls.client}/b/${b.slug}`} target="_blank" rel="noreferrer" className="text-a-600 underline">
          {b.slug}
        </a>
      ),
    },
    { key: t('business.menu'), value: t('business.counts', { services: b.services, team: b.team }) },
    ...Object.entries(b.about).map(([lang, about]) => ({ key: t('business.about', { lang }), value: about })),
  ]
  return <KeyValueList items={facts} />
}

function Pictures({ business: b }: { business: AdminBusiness }) {
  const t = useTranslations('business')
  const pictures = [...(b.logo ? [b.logo] : []), ...b.photos]
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={t('pictures')} />
      {pictures.length === 0 ? (
        <p className="text-small text-n-600">{t('noPictures')}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {pictures.map((p) => (
            <li key={p.url}>
              <img src={p.url} alt={p.alt} className="aspect-4/3 w-full rounded-m object-cover" />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function History({ business: b }: { business: AdminBusiness }) {
  const t = useTranslations('business')
  const format = useFormatter()
  // an action this app doesn't know yet shows as the api named it
  const actionWords = (action: string) => {
    const key = `action.${action}` as 'action.business.added'
    return t.has(key) ? t(key) : action
  }
  const lines = [
    ...b.history.map((h) => ({ at: h.at, what: t(`status.${h.status}`), reason: h.reason, by: null })),
    ...b.actions.map((a) => ({ at: a.at, what: actionWords(a.action), reason: a.reason, by: a.by })),
  ].sort((x, y) => y.at - x.at)
  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title={t('history')} />
      {lines.length === 0 ? (
        <p className="text-small text-n-600">{t('noHistory')}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <li key={i} className="flex flex-col text-small text-n-900">
              <b className="font-semibold">{line.what}</b>
              {line.reason && <span>{line.reason}</span>}
              <span className="text-dense text-n-600">{[format.dateTime(line.at, STAMP), line.by].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
