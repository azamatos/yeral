import { Link, useNavigate } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Chip } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { Input } from '@yeral/ui/input'
import { OptionList, SelectLayer, useSheet } from '@yeral/ui/select'
import { List, Search, SearchX, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { GROUPS_FROM, SEARCH_FROM, searchServices, type GroupResult, type Match, type ServiceMatch } from '../model/services'
import type { BookingState } from './business-page'

type Detail = BusinessDetail

/** A group's section in the list, where the index, the rail and the sheet jump to. */
const groupId = (id: string) => `services-${id}`

/** The rail's height (Venue v0.7 `.rail`), under the tab bar below 1280. */
const RAIL = 56

/**
 * Which group is under way as the page scrolls (Venue v0.7 · C3 «the current one highlighted while you scroll»): the
 * first group whose section crosses the band from under the stuck bars (the tab bar, the rail below 1280) to the top
 * third of the window; while the list is wholly below the band (the page's top), the last one stays. Measured once a
 * frame on scroll and resize, as the cover's fold is, and again when the groups listed change (a search).
 */
function useCurrentGroup(list: RefObject<HTMLElement | null>, listed: string, on: boolean, onChange: (id: string) => void) {
  useEffect(() => {
    const root = list.current
    if (!on || !root) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-group]'))
    if (sections.length === 0) return
    let frame = 0
    const measure = () => {
      frame = 0
      const bars = parseFloat(getComputedStyle(root).getPropertyValue('--tabs-end')) || 0
      const top = bars + (matchMedia('(max-width: 1279px)').matches ? RAIL : 0)
      const line = top + (innerHeight - top) / 3
      const first = sections.find((s) => {
        const r = s.getBoundingClientRect()
        return r.bottom > top && r.top < line
      })
      if (first?.dataset.group) onChange(first.dataset.group)
    }
    const update = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
    }
  }, [list, listed, on, onChange])
}

/**
 * The services panel at scale (Venue v0.7 · C3 `ServicesBrowser`, the owner's #42: 100 services in 15 groups). The list
 * is always whole and grouped, with each group's count in its header; from 3 groups a sticky index beside the list
 * (1280 and wider) or a rail of chips under the tab bar (narrower, with «Groups» opening them all in a sheet) jumps to
 * a group and follows the scroll; from 9 services a search in the names and descriptions keeps the matches in their
 * groups and marks them. One «Book» per row (the whole row is the target) opens the booking on the specialist step with
 * that service; more services are added in the booking (C7-Booking). On the owner's preview the buttons are there,
 * disabled (Q-153); a paused or phone-only page lists the services without them (States 05).
 */
export function ServicesBrowser({ detail, state }: { detail: Detail; state: BookingState }) {
  const t = useTranslations('business.services')
  const listed = detail.serviceGroups.filter((g) => g.services.length > 0)
  const total = listed.reduce((n, g) => n + g.services.length, 0)
  const [query, setQuery] = useState('')
  const result = searchServices(listed, query)
  const navigable = listed.length >= GROUPS_FROM
  const searchable = total >= SEARCH_FROM
  const shown = result.groups.filter((g) => g.services.length > 0)
  const [current, setCurrent] = useState(listed[0]?.id ?? '')
  // the group under way, among those listed: a search that leaves it out moves on to the first with matches
  const active = shown.some((g) => g.group.id === current) ? current : (shown[0]?.group.id ?? '')
  const top = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  useCurrentGroup(list, shown.map((g) => g.group.id).join(), navigable, setCurrent)
  const jump = (id: string) => {
    setCurrent(id)
    document.getElementById(groupId(id))?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  // «Clear search» brings the whole list back, scrolled to the top of Services
  const clearSearch = () => {
    setQuery('')
    top.current?.scrollIntoView({ block: 'start', behavior: 'instant' })
  }
  if (listed.length === 0) return <p className="m-0 text-body text-n-600">{t('none')}</p>
  const empty = result.searching && result.count === 0
  return (
    <>
      <div ref={top} className="scroll-mt-[var(--tabs-end)]" />
      {(searchable || navigable) && (
        <div className="flex flex-col">
          {searchable && (
            <div className="flex items-center gap-4 max-lg:flex-col max-lg:items-stretch max-lg:gap-2.5">
              <ServiceSearch value={query} onChange={setQuery} label={t('search', { count: total })} clearLabel={t('clear')} />
              {result.searching && (
                <p role="status" className="m-0 text-dense text-n-500">
                  {result.count === 0 ? t('noMatch') : t('matches', { count: result.count, q: query.trim(), groups: result.groupCount })}
                </p>
              )}
            </div>
          )}
          {navigable && !empty && (
            <GroupRail
              groups={result.searching ? shown : result.groups}
              active={active}
              onJump={jump}
              className={searchable ? 'mt-1' : ''}
            />
          )}
        </div>
      )}
      <div className="flex items-start gap-6">
        {navigable && <GroupIndex groups={result.groups} active={active} searching={result.searching} onJump={jump} />}
        <div ref={list} className="flex min-w-0 flex-1 flex-col">
          {empty ? (
            <NoMatches query={query.trim()} total={total} onClear={clearSearch} />
          ) : (
            shown.map(({ group, services }, i) => (
              <section
                key={group.id}
                id={groupId(group.id)}
                data-group={group.id}
                aria-labelledby={`${groupId(group.id)}-title`}
                // a jump lands the group's header right under the stuck bars (and the rail below 1280)
                className="scroll-mt-[calc(var(--tabs-end)+56px)] lg:scroll-mt-[var(--tabs-end)]"
              >
                {/* the group's name and count (Venue v0.7 `.sgh`); «5 of 9» while searching */}
                <h3
                  id={`${groupId(group.id)}-title`}
                  className={cn(
                    'm-0 flex items-baseline gap-2 border-b border-n-200 pb-2.5 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900',
                    i === 0 ? 'pt-1' : 'pt-6',
                  )}
                >
                  {group.name}
                  <span className="text-[15px] leading-5.5 font-medium tracking-normal text-n-500">
                    {result.searching ? t('ofTotal', { count: services.length, total: group.services.length }) : group.services.length}
                  </span>
                </h3>
                {services.map((m) => (
                  <ServiceRow key={m.service.id} slug={detail.slug} match={m} state={state} />
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </>
  )
}

/**
 * The search in the services (Venue v0.7 `ServiceSearch`): Input M 360 beside the count (L, full width, with the count
 * under it on the phone), «Search 100 services» as its name, × clears, and so does Esc while the field has the focus.
 */
function ServiceSearch({
  value,
  onChange,
  label,
  clearLabel,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  clearLabel: string
}) {
  return (
    <div className="relative w-90 flex-none max-sm:w-full">
      <Search
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-n-500 max-sm:left-3.5 max-sm:size-5"
      />
      <Input
        type="search"
        size="m"
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            onChange('')
          }
        }}
        className="pr-10 pl-9 max-sm:h-12 max-sm:rounded-ctl-l max-sm:pr-11 max-sm:pl-11 max-sm:text-ctl-l [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-ctl-s border-0 bg-transparent text-n-600 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none max-sm:right-2"
        >
          <X aria-hidden strokeWidth={1.75} className="size-4 max-sm:size-5" />
        </button>
      )}
    </div>
  )
}

/**
 * The sticky group index beside the list at 1280 and wider (Venue v0.7 `GroupIndex`): every group with its count, the
 * current one in the tint, the ones without a match greyed at 0 while searching («Matches by group»). A row jumps to
 * its group; the address stays as it is.
 */
function GroupIndex({
  groups,
  active,
  searching,
  onJump,
}: {
  groups: readonly GroupResult[]
  active: string
  searching: boolean
  onJump: (id: string) => void
}) {
  const t = useTranslations('business.services')
  return (
    <nav
      aria-label={t('groupIndex')}
      className="sticky top-[calc(var(--tabs-end)+16px)] flex w-50 flex-none flex-col gap-0.5 pt-1 max-lg:hidden"
    >
      <span className="px-2.5 pb-2 text-label text-n-500 uppercase">
        {searching ? t('matchesByGroup') : t('groupsCount', { count: groups.length })}
      </span>
      {groups.map(({ group, services }) => {
        const on = group.id === active
        const off = searching && services.length === 0
        return (
          <a
            key={group.id}
            href={`#${groupId(group.id)}`}
            aria-current={on ? 'true' : undefined}
            aria-disabled={off || undefined}
            onClick={(e) => {
              e.preventDefault()
              if (!off) onJump(group.id)
            }}
            className={cn(
              'flex h-9 flex-none items-center gap-2 rounded-ctl-s px-2.5 text-small font-medium whitespace-nowrap text-n-900 no-underline hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
              on && 'bg-a-50 font-semibold text-a-600 hover:bg-a-50',
              off && 'cursor-default text-n-400 hover:bg-transparent',
            )}
          >
            <span className="truncate">{group.name}</span>
            <span className={cn('ml-auto text-dense tabular-nums', on ? 'text-a-600' : off ? 'text-n-400' : 'text-n-500')}>
              {services.length}
            </span>
          </a>
        )
      })}
    </nav>
  )
}

/**
 * The rail under the tab bar below 1280 (Venue v0.7 `GroupRail`, the phone pattern): «Groups» opens every group with
 * its count in a sheet (a popover on a tablet), the current one ticked; beside it the groups as chips that scroll
 * sideways and fade at the edge, the current one in the tint and kept in view. A chip jumps to its group; it doesn't
 * filter, the list stays whole. While searching, only the groups with matches and their counts.
 */
function GroupRail({
  groups,
  active,
  onJump,
  className,
}: {
  groups: readonly GroupResult[]
  active: string
  onJump: (id: string) => void
  className?: string
}) {
  const t = useTranslations('business.services')
  const sheet = useSheet()
  const [open, setOpen] = useState(false)
  const strip = useRef<HTMLDivElement>(null)
  // the current chip stays in view as the page scrolls
  useEffect(() => {
    const el = strip.current
    const chip = el?.querySelector<HTMLElement>(`[data-group="${CSS.escape(active)}"]`)
    if (!el || !chip) return
    const pad = 16
    const fade = 40
    if (chip.offsetLeft < el.scrollLeft + pad) el.scrollTo({ left: chip.offsetLeft - pad })
    else if (chip.offsetLeft + chip.offsetWidth > el.scrollLeft + el.clientWidth - fade)
      el.scrollTo({ left: chip.offsetLeft + chip.offsetWidth - el.clientWidth + fade })
  }, [active])
  const pick = (id: string) => {
    setOpen(false)
    // after the sheet has given the focus back, so nothing scrolls twice
    requestAnimationFrame(() => onJump(id))
  }
  return (
    <div
      className={cn(
        'sticky top-[var(--tabs-end)] z-5 -mx-6 flex h-14 flex-none items-center gap-2 bg-n-0 py-2 pl-6 max-sm:-mx-4 max-sm:pl-4 lg:hidden',
        className,
      )}
    >
      <SelectLayer
        open={open}
        onOpenChange={setOpen}
        width="content"
        label={t('groups')}
        closeLabel={t('close')}
        trigger={
          <Button variant="secondary" size="m" className="flex-none px-3.5">
            <List aria-hidden />
            {t('groups')}
          </Button>
        }
      >
        <OptionList
          label={t('groups')}
          sheet={sheet}
          size="m"
          options={groups.map(({ group, services }) => ({ value: group.id, label: group.name, meta: services.length }))}
          picked={new Set([active])}
          onPick={pick}
        />
      </SelectLayer>
      <i aria-hidden className="h-6 w-px flex-none bg-n-200" />
      <div className="relative min-w-0 flex-1">
        <div
          ref={strip}
          className="relative flex [scrollbar-width:none] gap-2 overflow-x-auto pr-6 max-sm:pr-4"
          role="group"
          aria-label={t('groupIndex')}
        >
          {groups.map(({ group, services }) => {
            const on = group.id === active
            return (
              <Chip
                key={group.id}
                data-group={group.id}
                aria-current={on ? 'true' : undefined}
                onClick={() => onJump(group.id)}
                className={cn(on && 'border-a-line bg-a-50 text-a-600 hover:bg-a-100')}
              >
                {group.name}
                <span className={cn('font-medium', on ? 'text-a-600' : 'text-n-500')}>{services.length}</span>
              </Chip>
            )
          })}
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-r from-transparent to-n-0" />
      </div>
    </div>
  )
}

/** Nothing matches (Venue v0.7 `.empty`): in place of the list only; the field keeps its text, «Clear search» brings the list back. */
function NoMatches({ query, total, onClear }: { query: string; total: number; onClear: () => void }) {
  const t = useTranslations('business.services')
  return (
    <div className="flex flex-col items-center gap-1.5 px-6 py-12 text-center max-sm:py-14">
      <span aria-hidden className="mb-2.5 flex size-12 items-center justify-center rounded-pill bg-a-50 text-a-600">
        <SearchX className="size-6" strokeWidth={1.75} />
      </span>
      <span className="text-[16px] leading-6 font-semibold text-n-900">{t('nothing', { q: query })}</span>
      <span className="max-w-90 text-small text-n-600">{t('nothingLead', { count: total })}</span>
      <Button variant="tertiary" size="s" className={cn('mt-3', phoneM)} onClick={onClear}>
        {t('clearSearch')}
      </Button>
    </div>
  )
}

/** A control S at 768 and wider, M on the phone (touch): the row's Book and the empty state's Clear search. */
const phoneM = 'max-sm:h-10 max-sm:rounded-ctl-m max-sm:px-4 max-sm:text-ctl-m/5'

/** The words found, 700 (Venue v0.7 `ServiceRow` Match). */
function Marked({ text, match }: { text: string; match: Match | null }): ReactNode {
  if (!match) return text
  return (
    <>
      {text.slice(0, match.start)}
      <b className="font-bold text-n-900">{text.slice(match.start, match.end)}</b>
      {text.slice(match.end)}
    </>
  )
}

/**
 * One service (Venue v0.7 `ServiceRow`): the name and a one-line description, «60 min · 80 TMT» in a right-hand column
 * (under the name on the phone), one «Book» (S; M on the phone) that opens the booking on the specialist step with
 * this service. The whole row is the target: a press anywhere on it books too.
 */
function ServiceRow({ slug, match, state }: { slug: string; match: ServiceMatch; state: BookingState }) {
  const t = useTranslations('business.services')
  const fmt = useFmt()
  const lang = useLocale()
  const navigate = useNavigate()
  const { service: s } = match
  const link = { to: '/$lang/b/$slug/book', params: { lang, slug }, search: { services: s.id, step: 'staff' } } as const
  const bookable = state === 'online'
  const book = cn('[grid-area:book] min-w-28 flex-none justify-self-end max-sm:min-w-31', phoneM)
  return (
    <div
      className={cn(
        // text · meta · Book in one line (`.svr2`); on the phone the meta under the text, Book at the top right (`.ph`)
        'grid min-h-16 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-4 border-b border-n-100 py-2.5 [grid-template-areas:"text_meta_book"]',
        'max-sm:grid-cols-[minmax(0,1fr)_auto] max-sm:items-start max-sm:gap-x-3 max-sm:py-3.5 max-sm:[grid-template-areas:"text_book"_"meta_book"]',
        // the hover fill runs 12 px past the row on both sides (`.svr2.h`)
        bookable && 'cursor-pointer hover:bg-n-50 hover:shadow-[-12px_0_0_var(--color-n-50),12px_0_0_var(--color-n-50)]',
      )}
      onClick={
        bookable
          ? (e) => {
              // the button handles its own press (a middle click, a new tab)
              if ((e.target as Element).closest('a, button')) return
              void navigate(link)
            }
          : undefined
      }
    >
      <div className="flex min-w-0 flex-col [grid-area:text]">
        <span className="truncate text-[15px] leading-5.5 font-medium text-n-900">
          <Marked text={s.name} match={match.name} />
        </span>
        {s.description && (
          <span className="truncate text-dense text-n-500">
            <Marked text={s.description} match={match.description} />
          </span>
        )}
      </div>
      <span className="text-right text-small whitespace-nowrap text-n-600 [grid-area:meta] max-sm:mt-1 max-sm:text-left">
        {fmt.duration(s.durationMin)} · <span className="font-medium text-n-900">{fmt.price(s.price)}</span>
      </span>
      {state === 'online' ? (
        <Button asChild size="s" variant="secondary" className={book}>
          {/* the word seen stays in the name heard (axe: label-content-name-mismatch) */}
          <Link {...link} aria-label={t('bookLabel', { name: s.name })}>
            {t('book')}
          </Link>
        </Button>
      ) : (
        state === 'preview' && (
          <Button size="s" variant="secondary" className={book} disabled>
            {t('book')}
          </Button>
        )
      )}
    </div>
  )
}
