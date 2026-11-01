import { useNavigate } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { Select } from '@yeral/ui/select'
import { useId, useState, type FormEvent, type ReactNode, type Ref } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { placeAddress, WhereField, type usePlace } from '@/features/pick-place'

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
 * The hero's search card (Home, book C-02): What?, Where? and When? open the search. The page holds the place, as its list
 * and banner read it too.
 */
export function SearchCard({ located, whereInput }: { located: ReturnType<typeof usePlace>; whereInput: Ref<HTMLInputElement> }) {
  const t = useTranslations('home')
  const lang = useLocale()
  const navigate = useNavigate()
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState<When>('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void navigate({
      to: '/$lang/search',
      params: { lang },
      search: { what: what.trim() || undefined, ...placeAddress(located.place), day: when || undefined },
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
            <WhereField
              id={id}
              inputRef={whereInput}
              place={located.place}
              size="m"
              className="[&_input]:h-6 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-body [&_input]:shadow-none [&_svg.pointer-events-none]:hidden"
              onPick={located.pick}
              onNearMe={() => void located.askBrowser()}
            />
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
