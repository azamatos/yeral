import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Select } from '@yeral/ui/select'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'

type When = '' | 'tomorrow' | 'week'

/** One field of the card (Home `.sf`): its small label above what's typed or picked. */
function CardField({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 border-b border-n-200 px-4 py-3">
      <label htmlFor={id} className="text-label text-n-500 uppercase">
        {label}
      </label>
      {children(id)}
    </div>
  )
}

/**
 * The hero's search card (Home, book C-02): What?, Where? and When? open the search. «Where?» lists the cities for now; near
 * me and typed places come with slice 5's D4.
 */
export function SearchCard() {
  const t = useTranslations('home')
  const lang = useLocale()
  const sdk = useSdk()
  const navigate = useNavigate()
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const [what, setWhat] = useState('')
  const [city, setCity] = useState('')
  const [when, setWhen] = useState<When>('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void navigate({
      to: '/$lang/search',
      params: { lang },
      search: { what: what.trim() || undefined, city: city || undefined, day: when || undefined },
    })
  }

  const bare = 'w-full border-0 bg-transparent p-0 text-body text-n-900 outline-none'
  // a Select draws its box on the select inside it: here the card is the box, and the focus keeps its ring
  const bareSelect = '[&_select]:h-6 [&_select]:border-0 [&_select]:bg-transparent [&_select]:pl-0 [&_select]:text-body'
  return (
    <form onSubmit={submit} className="flex max-w-130 flex-col overflow-hidden rounded-l border border-n-300 bg-n-0">
      <CardField label={t('what')}>
        {(id) => (
          <input
            id={id}
            className={`${bare} placeholder:text-n-500`}
            placeholder={t('whatPlaceholder')}
            value={what}
            onChange={(e) => setWhat(e.target.value)}
          />
        )}
      </CardField>
      <div className="flex max-sm:flex-col">
        <CardField label={t('where')}>
          {(id) => (
            <Select id={id} size="s" className={bareSelect} value={city} onChange={(e) => setCity(e.target.value)}>
              {(cities?.items ?? []).map((c) => (
                <option key={c.id} value={c.id === cities?.main ? '' : c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </CardField>
        <CardField label={t('when')}>
          {(id) => (
            <Select id={id} size="s" className={bareSelect} value={when} onChange={(e) => setWhen(e.target.value as When)}>
              <option value="">{t('today')}</option>
              <option value="tomorrow">{t('tomorrow')}</option>
              <option value="week">{t('week')}</option>
            </Select>
          )}
        </CardField>
      </div>
      <div className="p-3">
        <Button type="submit" variant="primary" size="l" className="w-full">
          {t('submit')}
        </Button>
      </div>
    </form>
  )
}
