import { slugFrom } from '@yeral/domain/setup'
import { Avatar } from '@yeral/ui/avatar'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { useTranslations } from 'use-intl'
import { CategoryPicker, type PickableCategory } from './category-picker'
import { pageLink } from '@/shared/config'
import { StepHeader } from './setup-frame'

/** The business name's longest (design §28.5 text limits, the api's `setupStartSchema`). */
export const BUSINESS_NAME_MAX = 80

/**
 * Step 2, «About your business» (B-Onboarding `isBiz`, book B-03): the business name with its counter and the page
 * address it gives, and the category. Someone who already has a business («Create a business» from the switcher) sees
 * their account above it, since the new business joins the same account.
 */
export function BusinessStep({
  more,
  owner,
  name,
  onName,
  pageSlug,
  categoryId,
  onCategory,
  categories,
}: {
  more: boolean
  owner: { name: string; phone: string }
  name: string
  onName: (name: string) => void
  /** The draft's page address, once there is one: renaming the business doesn't change it. */
  pageSlug?: string
  categoryId: string | null
  onCategory: (id: string) => void
  categories: readonly PickableCategory[]
}) {
  const t = useTranslations()
  const brand = t('common.brand')
  // spaces around the name don't count: the api trims it before its limit
  const length = name.trim().length
  const long = length > BUSINESS_NAME_MAX
  // a new name's address as the api makes it (it adds a number if that one is taken)
  const slug = pageSlug ?? (length ? slugFrom(name) : '…')
  return (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader
        step="business"
        title={more ? t('setup.business.titleMore') : t('setup.business.title')}
        lead={more ? t('setup.business.leadMore', { brand }) : t('setup.business.lead')}
      />
      {more && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-m border border-n-200 bg-n-50 px-4 py-3">
          <Avatar name={owner.name} size={32} />
          <span className="flex min-w-0 flex-col">
            <span className="text-button font-semibold">{owner.name}</span>
            <span className="text-dense whitespace-nowrap text-n-600 tabular-nums">{owner.phone}</span>
          </span>
          <span className="flex-1" />
          <span className="text-dense text-n-600">{t('setup.business.account', { brand })}</span>
        </div>
      )}
      <Field
        label={t('setup.business.name')}
        error={long && t('setup.business.nameLong', { max: BUSINESS_NAME_MAX })}
        hint={t.rich('setup.business.page', {
          url: pageLink(slug).display,
          // the address in the board's mono 13, ink
          mono: (chunks) => <span className="font-mono text-dense text-n-900">{chunks}</span>,
        })}
        counter={{
          value: length,
          max: BUSINESS_NAME_MAX,
          text: t('setup.business.counter', { count: length, max: BUSINESS_NAME_MAX }),
        }}
      >
        <Input
          value={name}
          placeholder={t('setup.business.namePlaceholder')}
          autoComplete="organization"
          // twice the limit can be typed, so the counter and the error show what's too long (as the board does)
          maxLength={BUSINESS_NAME_MAX * 2}
          onChange={(e) => onName(e.target.value)}
        />
      </Field>
      <CategoryPicker categories={categories} value={categoryId} onChange={onCategory} />
    </section>
  )
}
