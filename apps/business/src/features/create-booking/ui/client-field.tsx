import { useQuery } from '@tanstack/react-query'
import type { ClientMatch } from '@yeral/contract/clients'
import { nationalDigits } from '@yeral/domain/phone'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Pill } from '@yeral/ui/pill'
import { PhoneInput } from '@yeral/ui/phone-input'
import { useState, type Ref } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'

const ROW =
  'flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-input border-0 bg-transparent px-2 py-1.5 text-left hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none'

/** A row of the matches: the name, the number, Phone only, the visits. */
function MatchRow({ match: m, onPick }: { match: ClientMatch; onPick: () => void }) {
  const t = useTranslations('newBooking.client')
  const fmt = useFmt()
  const name = m.name ?? t('unnamed')
  return (
    <button type="button" className={ROW} onClick={onPick}>
      <Avatar name={name} size={32} letters={1} tone="tint" decorative />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small font-semibold text-n-900">{name}</span>
        {m.phone && <span className="text-dense text-n-600">{fmt.phone(m.phone)}</span>}
      </span>
      {m.phoneOnly && (
        <Pill tone="warning" size="s">
          {t('phoneOnly')}
        </Pill>
      )}
      <span className="text-dense text-n-600">{t('visits', { n: m.visits })}</span>
    </button>
  )
}

/**
 * Who the booking is for (B-Calendar `panel=new`, book B-23 step 3): the number first, matching clients from 3 digits,
 * at 8 the known client's card with their alert notes, or «isn't saved yet» with a name; or a search by name. Whichever
 * way, the form holds the number, and a client picked.
 */
export function ClientField({
  slug,
  digits,
  client,
  name,
  showAverage,
  quick,
  phoneRef,
  onDigits,
  onClient,
  onName,
}: {
  slug: string
  digits: string
  /** The client the number belongs to, once known. */
  client: ClientMatch | null
  name: string
  /** The reader sees revenue: the average check on the card. */
  showAverage: boolean
  /** The phone's sheet (B-Mobile 5a): the field's own wording. */
  quick?: boolean
  /** The number field, focused first on a phone: the keypad opens with the sheet. */
  phoneRef?: Ref<HTMLInputElement>
  onDigits: (digits: string) => void
  onClient: (client: ClientMatch | null) => void
  onName: (name: string) => void
}) {
  const t = useTranslations('newBooking.client')
  const fmt = useFmt()
  const sdk = useSdk()
  const [byName, setByName] = useState(false)
  const [query, setQuery] = useState('')
  const [tried, setTried] = useState(false)

  const complete = digits.length === PHONE_RULES.maxDigits
  const matches = useQuery({ ...sdk.clients.lookup(slug, { phone: digits }), enabled: !client && digits.length >= 3 && !complete })
  const typed = query.trim()
  const isNumber = /^[\d\s+]+$/.test(typed)
  const found = useQuery(sdk.clients.lookup(slug, isNumber ? { phone: typed } : { name: typed }))
  const pick = (m: ClientMatch) => {
    onClient(m)
    onDigits(nationalDigits(m.phone ?? ''))
    setByName(false)
    setQuery('')
  }

  if (client) {
    const shown = client.name ?? t('unnamed')
    const line = [
      client.phone,
      t('visits', { n: client.visits }),
      ...(showAverage && client.avgCheck !== null ? [t('average', { amount: fmt.money(client.avgCheck) })] : []),
    ]
    return (
      <section className="flex flex-col gap-2.5">
        <span className="text-small font-medium text-n-900">{t('title')}</span>
        <div className="flex items-center gap-3 rounded-m border border-n-200 p-3">
          <Avatar name={shown} size={40} letters={1} tone="tint" decorative />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-small font-semibold text-n-900">{shown}</span>
            <span className="text-dense text-n-600">{line.join(t('dot'))}</span>
            {client.phoneOnly && (
              <Pill tone="warning" size="s" className="self-start">
                {t('phoneOnly')}
              </Pill>
            )}
          </span>
          <Button
            variant="ghost"
            size="s"
            onClick={() => {
              onClient(null)
              onDigits('')
              onName('')
            }}
          >
            {t('change')}
          </Button>
        </div>
        {client.alerts.map((alert) => (
          <Callout key={alert} tone="warning" title={t('alert')}>
            {alert}
          </Callout>
        ))}
      </section>
    )
  }

  const items = matches.data?.items ?? []
  const incomplete = tried && digits.length > 0 && !complete
  const hint = complete
    ? t('hintNew')
    : items.length
      ? t('hintPick')
      : digits.length
        ? t('hintFull', { n: PHONE_RULES.maxDigits })
        : t('hint')
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-small font-medium text-n-900">{t('title')}</span>
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-small font-semibold text-a-600 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          onClick={() => {
            setByName(!byName)
            setQuery('')
          }}
        >
          {byName ? t('byPhone') : t('byName')}
        </button>
      </div>
      {byName ? (
        <>
          <Input
            aria-label={t('search')}
            placeholder={t('search')}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-col">
            {(found.data?.items ?? []).map((m) => (
              <MatchRow key={m.id} match={m} onPick={() => pick(m)} />
            ))}
            {typed && found.isSuccess && found.data.items.length === 0 && (
              <p className="m-0 px-2 py-1.5 text-dense text-n-600">{t('noResult', { query: typed })}</p>
            )}
            <button
              type="button"
              className={ROW}
              onClick={() => {
                if (isNumber) onDigits(nationalDigits(typed).slice(0, PHONE_RULES.maxDigits))
                else onName(typed)
                setByName(false)
                setQuery('')
              }}
            >
              <span className="text-small font-semibold text-a-600">{t('createNew')}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <Field
            label={t(quick ? 'phoneQuick' : 'phone')}
            hint={incomplete ? undefined : hint}
            error={incomplete ? t('incomplete', { n: PHONE_RULES.maxDigits }) : undefined}
          >
            <PhoneInput
              {...PHONE_RULES}
              ref={phoneRef}
              size={44}
              value={digits}
              onValueChange={(next) => {
                onDigits(next)
                setTried(false)
              }}
              onBlur={() => setTried(true)}
            />
          </Field>
          {items.length > 0 && !complete && (
            <div className="flex flex-col">
              {items.map((m) => (
                <MatchRow key={m.id} match={m} onPick={() => pick(m)} />
              ))}
            </div>
          )}
          {complete && (
            <Field
              label={
                <>
                  {t('name')} <span className="font-normal text-n-600">{t('optional')}</span>
                </>
              }
            >
              <Input
                placeholder={t('namePlaceholder')}
                maxLength={80}
                autoComplete="off"
                value={name}
                onChange={(e) => onName(e.target.value)}
              />
            </Field>
          )}
        </>
      )}
    </section>
  )
}
