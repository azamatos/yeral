import { useNavigate } from '@tanstack/react-router'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { CalendarDays, ChevronRight, MapPin, Search } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { placeAddress } from '@/features/pick-place'
import { ANY_TIME, isAnyTime, whenAddress, type When } from '../model/when'
import { SearchSheet, type Field } from './search-sheet'
import { useWhenLabel } from './when-panel'
import { useWhere, type Located } from './where-panel'

const nothing = () => undefined

/** One tappable row of the card (60 high): the icon, the label over the value, a chevron. */
function CardRow({
  icon,
  label,
  value,
  placeholder,
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string | null
  placeholder?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-15 w-full cursor-pointer items-center gap-3 border-0 bg-n-0 pr-3 pl-4 text-left focus-visible:shadow-focus-inset focus-visible:outline-none active:bg-n-50 [&>svg]:size-5 [&>svg]:flex-none [&>svg]:text-n-600"
    >
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-micro font-semibold text-n-500">{label}</span>
        <span className={cn('truncate text-[16px] leading-[22px]', value ? 'text-n-900' : 'text-n-500')}>{value ?? placeholder}</span>
      </span>
      <ChevronRight aria-hidden className="size-4.5" />
    </button>
  )
}

/**
 * The phone's search card (C7-Home 390): the same three rows as the bar, each with an icon, a label and its value, and
 * Primary L Search; any row opens the full-screen SearchSheet at that field.
 */
export function SearchCard({ located, className }: { located: Located; className?: string }) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const navigate = useNavigate()
  const whenLabel = useWhenLabel()
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState<When>(ANY_TIME)
  const [field, setField] = useState<Field | null>(null)
  const where = useWhere({ typed: '', located, onPicked: nothing })
  const go = () =>
    navigate({
      to: '/$lang/search',
      params: { lang },
      search: { what: what.trim() || undefined, ...placeAddress(located.place), ...whenAddress(when, today()) },
    })
  return (
    <>
      <div className={cn('flex flex-col overflow-hidden rounded-card border border-n-200 bg-n-0 shadow-bar', className)}>
        <CardRow
          icon={<Search aria-hidden />}
          label={t('what')}
          value={what || null}
          placeholder={t('whatPlaceholder')}
          onClick={() => setField('what')}
        />
        <span aria-hidden className="ml-12 block h-px flex-none bg-n-100" />
        <CardRow icon={<MapPin aria-hidden />} label={t('where')} value={where.shown} onClick={() => setField('where')} />
        <span aria-hidden className="ml-12 block h-px flex-none bg-n-100" />
        <CardRow
          icon={<CalendarDays aria-hidden />}
          label={t('when')}
          value={isAnyTime(when) ? null : whenLabel(when)}
          placeholder={whenLabel(ANY_TIME)}
          onClick={() => setField('when')}
        />
        <div className="px-3 pt-1 pb-3">
          <Button variant="primary" size="l" className="w-full" onClick={() => void go()}>
            <Search aria-hidden />
            {t('submit')}
          </Button>
        </div>
      </div>
      {field && (
        <SearchSheet
          field={field}
          onField={setField}
          what={what}
          onWhat={setWhat}
          when={when}
          onWhen={setWhen}
          located={located}
          onClose={() => setField(null)}
        />
      )}
    </>
  )
}
