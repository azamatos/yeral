import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Input } from '@yeral/ui/input'
import { Headset, Search } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeral } from '@/features/contact-yeral'
import { matchesCategory } from '../model/match'

export type PickableCategory = { id: string; name: string; hint: string }

/**
 * Business/Onboarding/CategoryPicker (B-Onboarding step 2, COMPONENTS.md, round 3.4): the launch categories that take
 * appointments as one flat list of radio rows (44 high, r10; chosen = tint with an a-500 ring), «Selected: Beauty»
 * beside the label, a search over names and hints, and when nothing matches «No category fits? Contact Ýeral.» with the
 * support line's menu. The list's height is capped at 360 and scrolls.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
}: {
  categories: readonly PickableCategory[]
  value: string | null
  onChange: (id: string) => void
}) {
  const t = useTranslations()
  const brand = t('common.brand')
  const labelId = useId()
  const [query, setQuery] = useState('')
  const shown = categories.filter((c) => matchesCategory(c, query))
  const chosen = categories.find((c) => c.id === value)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <span id={labelId} className="text-dense font-semibold text-n-900">
          {t('setup.category.label')}
        </span>
        {chosen && (
          <span className="text-dense text-n-600">
            {t.rich('setup.category.selected', {
              name: chosen.name,
              b: (chunks) => <span className="font-semibold text-n-900">{chunks}</span>,
            })}
          </span>
        )}
      </div>
      <div className="relative">
        <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-3.75 left-3.5 size-4.5 text-n-600" />
        <Input
          type="search"
          aria-label={t('setup.category.search')}
          placeholder={t('setup.category.searchPlaceholder')}
          value={query}
          maxLength={40}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10.5"
        />
      </div>
      {shown.length > 0 ? (
        <div role="radiogroup" aria-labelledby={labelId} className="max-h-90 overflow-y-auto rounded-m border border-n-200 p-1.5">
          {shown.map((c) => {
            const on = c.id === value
            return (
              <label
                key={c.id}
                className={cn(
                  'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-s px-3 py-2 text-button text-n-900 hover:bg-n-50',
                  'has-[:focus-visible]:shadow-focus-inset',
                  on && 'bg-a-50 font-semibold text-a-600 hover:bg-a-50',
                )}
              >
                <input
                  type="radio"
                  name={labelId}
                  value={c.id}
                  checked={on}
                  onChange={() => onChange(c.id)}
                  className="size-5 flex-none cursor-pointer appearance-none rounded-pill border-[1.5px] border-n-500 bg-n-0 outline-none checked:border-6 checked:border-a-500"
                />
                <span className="min-w-0 flex-1">{c.name}</span>
              </label>
            )
          })}
        </div>
      ) : (
        <div role="status" className="flex flex-col items-start gap-2 rounded-m border border-n-200 p-5">
          <span className="text-body font-semibold">{t('setup.category.noneTitle', { brand })}</span>
          <span className="text-dense text-n-600">{t('setup.category.noneText', { query: query.trim() })}</span>
          <ContactYeral
            trigger={
              <Button type="button" variant="secondary" size="s">
                <Headset aria-hidden strokeWidth={1.75} />
                {t('support.contact', { brand })}
              </Button>
            }
          />
        </div>
      )}
    </div>
  )
}
