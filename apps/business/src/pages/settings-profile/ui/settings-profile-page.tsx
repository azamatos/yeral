import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { MARKET } from '@yeral/domain/market'
import { AMENITIES } from '@yeral/domain/model'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Checkbox } from '@yeral/ui/checkbox'
import { cn } from '@yeral/ui/cn'
import { FieldMessage } from '@yeral/ui/field'
import { Input, Textarea } from '@yeral/ui/input'
import { PhoneInput } from '@yeral/ui/phone-input'
import { SaveBar } from '@yeral/ui/save-bar'
import { Select } from '@yeral/ui/select'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { SettingsRow } from '@yeral/ui/settings-row'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { CircleAlert, ExternalLink, Headset, Info } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { ContactYeral } from '@/features/contact-yeral'
import { AddressFields, useAddressForm, type AddressFormState } from '@/features/edit-address'
import { useSdk } from '@/shared/api'
import { pageLink } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { ABOUT_MAX, NAME_MAX, toggleAmenity } from '../model/profile'
import { useProfileForm, type ProfileFormState } from '../model/use-profile-form'
import { LogoRow } from './logo-row'
import { PHOTOS_ANCHOR, PhotosSection } from './photos-section'

/**
 * Settings → Business profile (B-Settings `isProfile`, design §8 and §28.5, book B-37): «View your page»; when the Ýeral
 * team sent the page back, their reason with «Send again»; the main details (the logo, saved at once; the name and the
 * category), the About, the photos (each change saved at once), the phone for clients and the amenities, and «Pause
 * online booking», with «Close this workspace» for the owner (by contacting Ýeral: there's no delete), and the address
 * with its map. One save bar for the details and the address while they differ from what's saved, «Saved» after.
 */
export function SettingsProfilePage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  // another business's page starts afresh: nothing typed or said about one shows under the other
  return (
    <ProfileSection key={workspace.slug} slug={workspace.slug} owner={workspace.level === 'owner'} demo={workspace.status === 'demo'} />
  )
}

function ProfileSection({ slug, owner, demo }: { slug: string; owner: boolean; demo: boolean }) {
  const t = useTranslations('settings')
  const errorText = useErrorText()
  const profile = useProfileForm(slug)
  const address = useAddressForm(slug, true)
  const lead = t('profile.lead')
  const action = (
    <a
      href={pageLink(slug).url}
      target="_blank"
      rel="noreferrer"
      className={cn(textLink, 'inline-flex min-h-9 items-center gap-1.5 text-small')}
    >
      {t('profile.viewPage')}
      <ExternalLink aria-hidden className="size-4" />
      <span className="sr-only">{t('profile.opensNewTab')}</span>
    </a>
  )

  if (!profile || !address)
    return (
      <SettingsPage section="profile" lead={lead} action={action}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  // one save bar for the details and the address, each sent to the profile only when it changed
  const dirty = profile.dirty || address.edited
  const valid = profile.valid && (!address.edited || !address.problem)
  const saving = profile.saving || address.saving
  const save = async () => {
    if (profile.dirty && !(await profile.save())) return
    try {
      if (address.edited) await address.save()
      toast(t('save.saved'))
    } catch (error) {
      toast(errorText(error))
    }
  }
  const discard = () => {
    profile.discard()
    address.discard()
  }

  return (
    <SettingsPage section="profile" lead={lead} action={action}>
      {profile.profile.verification === 'rejected' && (
        <SentBack slug={slug} reason={profile.profile.verificationReason} owner={owner} unsaved={profile.dirty} />
      )}
      <SettingsSection aria-labelledby={`${slug}-main`}>
        <SettingsSectionTitle id={`${slug}-main`}>{t('profile.main')}</SettingsSectionTitle>
        <LogoRow slug={slug} profile={profile.profile} />
        <NameRow profile={profile} />
        <CategoryRow profile={profile} />
      </SettingsSection>
      <AboutSection profile={profile} />
      <PhotosSection slug={slug} />
      <ContactSection profile={profile} />
      <AddressSection address={address} disabled={saving} />
      <PauseSection profile={profile} owner={owner && !demo} />
      {dirty && (
        <SaveBar
          message={t('save.question')}
          label={t('save.unsaved')}
          discardLabel={t('save.discard')}
          saveLabel={t('save.save')}
          savingLabel={t('save.saving')}
          onDiscard={discard}
          onSave={() => void save()}
          invalid={!valid}
          saving={saving}
          // on a phone above the shell's tab bar, where its toasts sit too (B-Settings `.sbar` under 768)
          className="max-sm:bottom-[var(--toast-bottom,12px)]"
        />
      )}
    </SettingsPage>
  )
}

/**
 * The address (B-Settings «Address»): the wizard's fields (`features/edit-address`), «Moved? Change the address here…»
 * and, for a second place at the same time, «Create a business» (a workspace of its own).
 */
function AddressSection({ address, disabled }: { address: AddressFormState; disabled: boolean }) {
  const t = useTranslations('settings.profile.address')
  const brand = useTranslations('common')('brand')
  const titleId = useId()
  return (
    <SettingsSection aria-labelledby={titleId}>
      <SettingsSectionTitle id={titleId} caption={t('caption')}>
        {t('title')}
      </SettingsSectionTitle>
      <AddressFields address={address} disabled={disabled} />
      <Callout tone="neutral" size="s" icon={<Info aria-hidden />} live={false}>
        {t.rich('moved', { brand, b: (words) => <b>{words}</b> })}
      </Callout>
      <p className="m-0 text-dense text-n-600">
        {t.rich('another', {
          link: (words) => (
            <Link to="/setup/$step" params={{ step: 'business' }} className={textLink}>
              {words}
            </Link>
          ),
        })}
      </p>
    </SettingsSection>
  )
}

/**
 * «Your page wasn't approved» (B-Settings `.rbox`): the Ýeral team's reason, and for the owner «Send again» once it's
 * fixed (the api takes it from the owner only), waiting while there are changes to save first.
 */
function SentBack({ slug, reason, owner, unsaved }: { slug: string; reason: string | null; owner: boolean; unsaved: boolean }) {
  const t = useTranslations('settings.profile.notApproved')
  const sdk = useSdk()
  const errorText = useErrorText()
  const send = useMutation(sdk.settings.sendForReview(slug))
  const titleId = useId()
  return (
    <div role="region" aria-labelledby={titleId} className="mb-6 flex flex-col gap-2.5 rounded-m border border-danger-line bg-n-0 p-4">
      <div className="flex items-start gap-2.5 text-body font-semibold text-danger-ink">
        <CircleAlert aria-hidden className="mt-px size-5 flex-none" />
        <span id={titleId}>{t('title')}</span>
      </div>
      {reason && <p className="m-0 text-small text-n-900">{reason}</p>}
      <p id={`${titleId}-caption`} className="m-0 text-dense text-n-600">
        {owner ? t('caption') : t('captionAdmin')}
      </p>
      <div className="flex flex-wrap gap-2">
        {owner && (
          <Button
            size="s"
            variant="primary"
            loading={send.isPending}
            disabled={unsaved}
            aria-describedby={`${titleId}-caption`}
            onClick={() => send.mutate(undefined, { onSuccess: () => toast(t('sent')), onError: (error) => toast(errorText(error)) })}
          >
            {t('send')}
          </Button>
        )}
        <Button asChild size="s" variant="ghost">
          <a href={`#${PHOTOS_ANCHOR}`}>{t('toPhotos')}</a>
        </Button>
      </div>
    </div>
  )
}

/** Under a text field: its message on the left (from the save's rules), the counter «12 / 80» on the right. */
function TextNotes({ id, message, count, max }: { id: string; message: ReactNode; count: number; max: number }) {
  const t = useTranslations('settings.profile')
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
      {message ? (
        <FieldMessage id={`${id}-message`} status="error">
          {message}
        </FieldMessage>
      ) : null}
      <span
        id={`${id}-counter`}
        className={cn(
          'ml-auto text-dense whitespace-nowrap text-n-600 tabular-nums',
          count > max ? 'font-semibold text-danger-ink' : count >= max * 0.9 && 'text-st-pending-ink',
        )}
      >
        {t('counter', { count, max })}
      </span>
    </div>
  )
}

function NameRow({ profile }: { profile: ProfileFormState }) {
  const t = useTranslations('settings.profile')
  const id = useId()
  const problem = profile.problems.name
  const count = profile.form.name.trim().length
  return (
    <SettingsRow id={id} label={t('name')} description={t('nameCaption')} wide invalid={!!problem}>
      <Input
        className="h-11"
        value={profile.form.name}
        // twice the limit can be typed, so the counter and the error show what's too long (as the board does)
        maxLength={NAME_MAX * 2}
        disabled={profile.saving}
        aria-describedby={[`${id}-help`, problem && `${id}-message`, `${id}-counter`].filter(Boolean).join(' ')}
        onChange={(e) => profile.set({ name: e.target.value })}
      />
      <TextNotes
        id={id}
        count={count}
        max={NAME_MAX}
        message={problem === 'nameEmpty' ? t('nameEmpty') : problem === 'nameLong' ? t('nameLong', { max: NAME_MAX }) : null}
      />
    </SettingsRow>
  )
}

/** The launch categories that take appointments (design §28.5), and «No category fits? Contact Ýeral.». */
function CategoryRow({ profile }: { profile: ProfileFormState }) {
  const t = useTranslations()
  const locale = useLocale()
  const sdk = useSdk()
  const categories = useQuery(sdk.catalog.categories(locale))
  const options = (categories.data?.items ?? []).filter((c) => c.bookingTypes.includes('appointment') || c.id === profile.form.categoryId)
  return (
    <SettingsRow label={t('settings.profile.category')} description={t('settings.profile.categoryCaption')} wide>
      <Select
        size="m"
        className="w-full"
        value={profile.form.categoryId}
        disabled={profile.saving || !categories.data}
        onChange={(e) => profile.set({ categoryId: e.target.value })}
      >
        {options.length ? (
          options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))
        ) : (
          // until the list loads: the one chosen, unnamed (the select waits)
          <option value={profile.form.categoryId} />
        )}
      </Select>
      <span className="text-dense text-n-600">
        {t.rich('settings.profile.noCategory', {
          brand: t('common.brand'),
          contact: (words) => (
            <ContactYeral
              trigger={
                <button type="button" className={cn(textLink, 'text-dense')}>
                  {words}
                </button>
              }
            />
          ),
        })}
      </span>
    </SettingsRow>
  )
}

function AboutSection({ profile }: { profile: ProfileFormState }) {
  const t = useTranslations('settings.profile')
  const id = useId()
  const problem = profile.problems.about
  return (
    <SettingsSection aria-labelledby={`${id}-title`}>
      <SettingsSectionTitle id={`${id}-title`} caption={t('aboutCaption')}>
        {t('about')}
      </SettingsSectionTitle>
      <div className="flex flex-col gap-2">
        <Textarea
          id={id}
          aria-label={t('aboutLabel')}
          className="h-36"
          value={profile.form.about}
          placeholder={t('aboutPlaceholder')}
          maxLength={ABOUT_MAX * 2}
          invalid={!!problem}
          disabled={profile.saving}
          aria-describedby={[problem && `${id}-message`, `${id}-counter`].filter(Boolean).join(' ')}
          onChange={(e) => profile.set({ about: e.target.value })}
        />
        <TextNotes
          id={id}
          count={profile.form.about.trim().length}
          max={ABOUT_MAX}
          message={problem === 'aboutEmpty' ? t('aboutEmpty') : problem === 'aboutLong' ? t('aboutLong', { max: ABOUT_MAX }) : null}
        />
      </div>
    </SettingsSection>
  )
}

function ContactSection({ profile }: { profile: ProfileFormState }) {
  const t = useTranslations('settings.profile')
  const id = useId()
  const problem = profile.problems.phone
  return (
    <SettingsSection aria-labelledby={`${id}-title`}>
      <SettingsSectionTitle id={`${id}-title`}>{t('contact')}</SettingsSectionTitle>
      <SettingsRow id={`${id}-phone`} label={t('phone')} description={t('phoneCaption')} wide invalid={!!problem}>
        <PhoneInput
          size={44}
          {...PHONE_RULES}
          id={`${id}-phone`}
          invalid={!!problem}
          value={profile.form.phone}
          disabled={profile.saving}
          aria-describedby={[`${id}-phone-help`, problem && `${id}-phone-message`].filter(Boolean).join(' ')}
          onValueChange={(phone) => profile.set({ phone })}
        />
        {problem && (
          <FieldMessage id={`${id}-phone-message`} status="error">
            {problem === 'phoneInvalid' ? t('phoneInvalid') : t('phoneIncomplete', { digits: MARKET.phone.length })}
          </FieldMessage>
        )}
      </SettingsRow>
      <div role="group" aria-labelledby={`${id}-amenities`} className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span id={`${id}-amenities`} className="text-body font-medium text-n-900">
            {t('amenities')}
          </span>
          <span className="text-dense text-n-600">{t('amenitiesCaption')}</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-x-4">
          {AMENITIES.map((amenity) => (
            <Checkbox
              key={amenity}
              label={t(`amenity.${amenity}`)}
              className="min-h-11"
              checked={profile.form.amenities.includes(amenity)}
              disabled={profile.saving}
              onChange={(e) => profile.set({ amenities: toggleAmenity(profile.form.amenities, amenity, e.target.checked) })}
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  )
}

/**
 * «Pause online booking» (a booking rule, switched here) and, for the owner, «Close this workspace»: there's no
 * delete, Ýeral closes it (design §28.5). The demo workspace's owner has no one to ask, so it's left out there.
 */
function PauseSection({ profile, owner }: { profile: ProfileFormState; owner: boolean }) {
  const t = useTranslations()
  const p = useTranslations('settings.profile')
  const contact = useTranslations('support')
  const id = useId()
  const brand = t('common.brand')
  return (
    <SettingsSection aria-labelledby={`${id}-title`}>
      <SettingsSectionTitle id={`${id}-title`}>{owner ? p('closeTitle') : p('onlineTitle')}</SettingsSectionTitle>
      <SettingsRow label={p('pause')} description={p('pauseCaption')}>
        {({ id: switchId, labelId, descriptionId }) => (
          <Switch
            id={switchId}
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            checked={profile.form.paused}
            disabled={profile.saving}
            onCheckedChange={(paused) => profile.set({ paused })}
          />
        )}
      </SettingsRow>
      {profile.form.paused && (
        <Callout tone="neutral" size="s" icon={<Info aria-hidden />} role="status">
          {p('paused')}
        </Callout>
      )}
      {owner && (
        <SettingsRow label={p('close')} description={p('closeCaption', { brand })}>
          <ContactYeral
            trigger={
              <Button size="s">
                <Headset aria-hidden />
                {contact('contact', { brand })}
              </Button>
            }
          />
        </SettingsRow>
      )}
    </SettingsSection>
  )
}
