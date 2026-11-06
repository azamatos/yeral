import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Chip } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { Skeleton } from '@yeral/ui/skeleton'
import { Search, Sparkles } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { CategoryIcon } from '@/entities/category'
import { SUGGEST_DELAY_MS, useDebounced } from '../model/use-debounced'
import type { Listbox } from '../model/use-listbox'
import { Mark, Meta, Panel, Rows, SectionTitle, Tile, type Row, type Section } from './panel'

/** Up to three of each group (the board). */
const PER_GROUP = 3

export type WhatHandlers = {
  onCategory: (id: string) => void
  onService: (name: string) => void
  onBusiness: (slug: string) => void
  /** The last row: the words as typed. */
  onSearch: () => void
}

/**
 * The suggestions for what's typed (C7-Home «What»): Categories · Services · Businesses from the api's suggest, up to
 * three each, the typed part in 600; nothing typed → the categories as chips. The api is asked once the typing pauses
 * and the last answer stays up until the next one, so the rows don't flicker per letter. The api gives no place counts
 * for services and no photo, distance or rating for businesses yet, so the rows show what it gives.
 */
export function useWhat(q: string, h: WhatHandlers, touch?: boolean) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const sdk = useSdk()
  const term = q.trim()
  const asked = useDebounced(term, SUGGEST_DELAY_MS)
  const categories = useQuery(sdk.catalog.categories(lang)).data?.items ?? []
  const suggest = useQuery({ ...sdk.catalog.suggest(asked, lang), placeholderData: keepPreviousData })
  const found = term ? suggest.data : undefined
  const settled = asked === term && !suggest.isPlaceholderData
  const sections: Section[] = []
  if (found) {
    const icon = (id: string) => categories.find((c) => c.id === id)
    sections.push({
      title: t('categories'),
      rows: found.categories.slice(0, PER_GROUP).map((c): Row => ({
        id: `what-cat-${c.id}`,
        pick: () => h.onCategory(c.id),
        node: (
          <>
            <CategoryIcon name={icon(c.id)?.icon} className="size-4.5 text-n-600" />
            <span className="min-w-0 truncate">
              <Mark text={c.name} q={term} />
            </span>
            {icon(c.id)?.hint && <Meta>{icon(c.id)?.hint}</Meta>}
          </>
        ),
      })),
    })
    sections.push({
      title: t('services'),
      rows: found.services.slice(0, PER_GROUP).map((name, i): Row => ({
        id: `what-svc-${i}`,
        pick: () => h.onService(name),
        node: (
          <>
            <Sparkles aria-hidden />
            <span className="min-w-0 truncate">
              <Mark text={name} q={term} />
            </span>
          </>
        ),
      })),
    })
    sections.push({
      title: t('businesses'),
      rows: found.businesses.slice(0, PER_GROUP).map((b): Row => ({
        id: `what-biz-${b.slug}`,
        tall: true,
        pick: () => h.onBusiness(b.slug),
        node: (
          <>
            <Tile touch={touch}>{b.name.slice(0, 1)}</Tile>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate">
                <Mark text={b.name} q={term} />
              </span>
              <span className="truncate text-dense text-n-500">{b.category}</span>
            </span>
          </>
        ),
      })),
    })
  }
  const rows = sections.flatMap((s) => s.rows)
  const showAll: Row | null = term
    ? {
        id: 'what-all',
        pick: h.onSearch,
        node: (
          <>
            <Search aria-hidden />
            <span className="min-w-0 flex-1 truncate">
              {t.rich('showAll', { q: term, b: (chunks) => <b className="font-semibold">{chunks}</b> })}
            </span>
            {!touch && <Meta>{t('enter')}</Meta>}
          </>
        ),
      }
    : null
  return {
    term,
    categories,
    sections: showAll ? [...sections, { divider: rows.length > 0, rows: [showAll] }] : sections,
    rows: showAll ? [...rows, showAll] : rows,
    loading: !!term && !found,
    nothing: !!found && settled && rows.length === 0,
  }
}

export function WhatPanel({
  what,
  listbox,
  listId,
  touch,
  className,
  ...props
}: ComponentProps<'div'> & { what: ReturnType<typeof useWhat>; listbox: Listbox; listId: string; touch?: boolean }) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  return (
    <Panel {...props} touch={touch} className={className}>
      {!what.term && (
        <>
          <SectionTitle touch={touch}>{t('popular')}</SectionTitle>
          <div className={cn('flex flex-wrap gap-2', touch ? 'px-4 pt-1 pb-2' : 'px-2.5 pt-1 pb-2')}>
            {what.categories.map((c) => (
              <Chip key={c.id} asChild className={touch ? 'h-10 px-4' : 'h-8 px-3 text-dense'}>
                <Link to="/$lang/c/$category" params={{ lang, category: c.id }} onMouseDown={(e) => e.preventDefault()}>
                  <CategoryIcon name={c.icon} className="size-4 text-n-600" />
                  {c.name}
                </Link>
              </Chip>
            ))}
          </div>
        </>
      )}
      {what.loading && (
        <div role="status" aria-label={t('loading')} className={cn('flex flex-col gap-2', touch ? 'px-4 pt-3' : 'px-2.5 pt-2')}>
          <SectionTitle touch={touch}>{t('services')}</SectionTitle>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className={cn('h-5 rounded-xs', i === 1 ? 'w-2/3' : 'w-1/2')} />
          ))}
        </div>
      )}
      {what.nothing && (
        <div role="status" className="flex h-16 flex-none items-center justify-center text-dense text-n-500">
          {t('nothing', { q: what.term })}
        </div>
      )}
      <Rows id={listId} label={t('suggestions')} sections={what.sections} listbox={listbox} touch={touch} />
    </Panel>
  )
}
