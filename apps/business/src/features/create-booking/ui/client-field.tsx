import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import type { ClientMatch } from '@yeral/contract/clients'
import { MARKET } from '@yeral/domain/market'
import { nationalDigits } from '@yeral/domain/phone'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Combobox, ComboboxInput, ComboboxList } from '@yeral/ui/combobox'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Pill } from '@yeral/ui/pill'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Plus } from 'lucide-react'
import { useState, type Ref } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { digitsMatchIn, isDigitsQuery, matchIn, queryDigits } from '../model/client-search'
import type { ChosenClient } from '../model/new-booking'
import { Highlight } from './highlight'

const TITLE = 'text-small font-medium text-n-900'
/** The 5 most frequent before anything's typed; at most 8 matches, the rest is «keep typing». */
const FREQUENT = 5
const MATCHES = 8

/**
 * Who the booking is for (B7-Booking · ClientCombobox): one field for a name or a number — letters search names,
 * digits search numbers, nothing to switch. Before typing, the frequent clients; then at most 8 matches with the
 * grouped number and «Last visit · visits», the match in bold, so five Jahans are told apart; «+ New client “…”» is
 * the last row and opens the inline form (the name from the letters, the number from the digits; a number already
 * saved offers that client instead). The chosen client is a card with Change; their alert notes show under it.
 */
export function ClientField({
  slug,
  chosen,
  alerts,
  creating,
  digits,
  name,
  known,
  quick,
  inputRef,
  onChoose,
  onCreating,
  onDigits,
  onName,
}: {
  slug: string
  /** The client picked from the list (or the one «Book again» opened with). */
  chosen: ChosenClient | null
  /** Their notes «shown when booking», once the lookup by their number answers. */
  alerts: readonly string[]
  /** The inline New client form in place of the field. */
  creating: boolean
  /** The new client's number, national digits. */
  digits: string
  name: string
  /** The client the new client's number already belongs to: the warning that offers them. */
  known: ClientMatch | null
  /** The phone's sheet (B7 · 390): L controls. */
  quick?: boolean
  /** The search field, focused first on a phone. */
  inputRef?: Ref<HTMLInputElement>
  onChoose: (client: ChosenClient | null) => void
  onCreating: (on: boolean) => void
  onDigits: (digits: string) => void
  onName: (name: string) => void
}) {
  const t = useTranslations('newBooking.client')
  const fmt = useFmt()
  const sdk = useSdk()
  const [query, setQuery] = useState('')
  const [tried, setTried] = useState(false)

  const typed = query.trim()
  const byDigits = isDigitsQuery(typed)
  const q = byDigits ? queryDigits(typed) : typed
  const list = useInfiniteQuery({
    ...sdk.clients.list(slug, { ...(q ? { q } : {}), sort: 'visits', limit: q ? MATCHES : FREQUENT }),
    enabled: !chosen && !creating,
    placeholderData: keepPreviousData,
  })
  const first = list.data?.pages[0]
  // a client whose number passed to someone else can't be booked by it
  const rows = (first?.items ?? []).filter((c) => c.phone !== null)
  const total = first?.counts.all ?? 0
  const nameOf = (c: { name: string | null }) => c.name ?? t('unnamed')
  const visitsOf = (c: { visits: number; lastVisit: string | null }) =>
    c.lastVisit ? t('lastVisit', { date: fmt.shortDate(c.lastVisit), n: c.visits }) : t('visits', { n: c.visits })

  const pick = (c: ChosenClient) => {
    onChoose(c)
    onDigits(nationalDigits(c.phone ?? ''))
    onName('')
    setQuery('')
  }
  const startNew = () => {
    onChoose(null)
    onDigits(byDigits ? nationalDigits(q).slice(0, PHONE_RULES.maxDigits) : '')
    onName(byDigits ? '' : typed)
    onCreating(true)
    setQuery('')
    setTried(false)
  }

  if (chosen) {
    const shown = nameOf(chosen)
    return (
      <section className="flex flex-col gap-2.5">
        <span className={TITLE}>{t('title')}</span>
        <div className="flex items-center gap-3 rounded-ctl-l border border-n-200 p-3">
          <Avatar name={shown} size={40} letters={1} tone="tint" decorative />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-small font-semibold text-n-900">{shown}</span>
            {chosen.phone && <span className="text-dense text-n-600">{fmt.phone(chosen.phone)}</span>}
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-dense text-n-600">
              {visitsOf(chosen)}
              {chosen.phoneOnly && (
                <Pill tone="warning" size="s">
                  {t('phoneOnly')}
                </Pill>
              )}
            </span>
          </span>
          <Button
            variant="tertiary"
            size="s"
            className="flex-none"
            onClick={() => {
              // the search comes back with the name typed
              setQuery(chosen.name ?? '')
              onChoose(null)
              onDigits('')
            }}
          >
            {t('change')}
          </Button>
        </div>
        {alerts.map((alert) => (
          <Callout key={alert} tone="warning" title={t('alert')}>
            {alert}
          </Callout>
        ))}
      </section>
    )
  }

  if (creating) {
    const complete = digits.length === PHONE_RULES.maxDigits
    const incomplete = tried && !complete
    return (
      <section className="flex flex-col gap-2.5">
        <span className={TITLE}>{t('title')}</span>
        <div className="flex flex-col gap-3 rounded-ctl-l border border-n-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-small font-semibold text-n-900">{t('newClientTitle')}</span>
            <Button
              variant="tertiary"
              size="s"
              onClick={() => {
                onCreating(false)
                onDigits('')
                onName('')
              }}
            >
              {t('cancel')}
            </Button>
          </div>
          <Field
            label={
              <>
                {t('name')} <span className="font-normal text-n-600">{t('optional')}</span>
              </>
            }
          >
            <Input
              size={quick ? 'l' : 'm'}
              placeholder={t('namePlaceholder')}
              maxLength={80}
              autoComplete="off"
              value={name}
              onChange={(e) => onName(e.target.value)}
            />
          </Field>
          <Field label={t('phone')} error={incomplete ? t('incomplete', { n: PHONE_RULES.maxDigits }) : undefined}>
            <PhoneInput
              {...PHONE_RULES}
              size={quick ? 48 : 40}
              value={digits}
              onValueChange={(next) => {
                onDigits(next)
                setTried(false)
              }}
              onBlur={() => setTried(true)}
            />
          </Field>
          {known && complete && (
            <Callout tone="warning" title={t('knownNumber', { name: nameOf(known) })}>
              <Button
                variant="secondary"
                size="s"
                onClick={() => {
                  onCreating(false)
                  pick({
                    id: known.id,
                    name: known.name,
                    phone: known.phone,
                    visits: known.visits,
                    lastVisit: null,
                    phoneOnly: known.phoneOnly,
                  })
                }}
              >
                {t('chooseKnown', { name: nameOf(known) })}
              </Button>
            </Callout>
          )}
        </div>
      </section>
    )
  }

  const options = rows.map((c) => {
    const shown = nameOf(c)
    const number = c.phone ? fmt.phone(c.phone) : ''
    return {
      id: c.id,
      icon: <Avatar name={shown} size={32} letters={1} tone="tint" decorative />,
      label: (
        <span className="block truncate font-medium">
          <Highlight text={shown} range={byDigits ? null : matchIn(shown, q)} />
        </span>
      ),
      description: number && <Highlight text={number} range={byDigits ? digitsMatchIn(number, q, MARKET.phone.countryCode) : null} />,
      meta: visitsOf(c),
    }
  })
  return (
    <section className="flex flex-col gap-2.5">
      <Combobox
        value={query}
        onValueChange={setQuery}
        options={options}
        onSelect={(o) => {
          const c = rows.find((r) => r.id === o.id)
          if (c) pick({ id: c.id, name: c.name, phone: c.phone, visits: c.visits, lastVisit: c.lastVisit, phoneOnly: c.phoneOnly })
        }}
        listLabel={t('list')}
        section={typed ? undefined : t('frequent')}
        empty={typed && list.isSuccess && rows.length === 0 ? t('noClient', { query: typed }) : undefined}
        more={total > rows.length && typed ? t('showing', { shown: rows.length, total }) : undefined}
        create={{ icon: <Plus aria-hidden />, label: typed ? t('newClient', { query: typed }) : t('newClientPlain'), onSelect: startNew }}
      >
        <Field label={t('title')}>
          <ComboboxInput ref={inputRef} size={quick ? 'l' : 'm'} placeholder={t('search')} />
        </Field>
        <ComboboxList />
      </Combobox>
    </section>
  )
}
