import { Avatar } from '@yeral/ui/avatar'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { useTranslations } from 'use-intl'
import { PageAddressField, type PageAddressState } from '@/features/page-address'
import { BUSINESS_NAME_MAX } from '@/shared/config'
import { CategoryPicker, type PickableCategory } from './category-picker'
import { StepHeader } from './setup-frame'

/**
 * Step 2, «About your business» (B-Onboarding `isBiz`, book B-03): the business name with its counter, the page address
 * (the board shows the one the name gives; the owner may write their own, chapter 9 25.10.2026), and the category.
 * Someone who already has a business («Create a business» from the switcher) sees their account above it, since the
 * new business joins the same account.
 */
export function BusinessStep({
  more,
  owner,
  name,
  onName,
  address,
  onAddress,
  addressState,
  categoryId,
  onCategory,
  categories,
}: {
  more: boolean
  owner: { name: string; phone: string }
  name: string
  onName: (name: string) => void
  /** The page address shown: the one the name gives (or the draft's) until the owner writes their own. */
  address: string
  onAddress: (slug: string) => void
  addressState: PageAddressState
  categoryId: string | null
  onCategory: (id: string) => void
  categories: readonly PickableCategory[]
}) {
  const t = useTranslations()
  const brand = t('common.brand')
  // spaces around the name don't count: the api trims it before its limit
  const length = name.trim().length
  const long = length > BUSINESS_NAME_MAX
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
      <PageAddressField value={address} onChange={onAddress} state={addressState} />
      <CategoryPicker categories={categories} value={categoryId} onChange={onCategory} />
    </section>
  )
}
