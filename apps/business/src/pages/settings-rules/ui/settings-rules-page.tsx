import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { localized } from '@yeral/domain/model'
import { Callout } from '@yeral/ui/callout'
import { SaveBar } from '@yeral/ui/save-bar'
import { Spinner } from '@yeral/ui/spinner'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingRulesForm, useRuleLabels, useRulesForm } from '@/features/edit-booking-rules'
import { useSdk } from '@/shared/api'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { RulesPreview } from './rules-preview'

/**
 * Settings → Booking rules (B-Settings `isRules`, design §8 and §28.5, book B-05, B-41, B-42): the rules form with its
 * save bar while there are changes and «Saved» after, the note that online booking is paused (it's switched in Business
 * profile), the services that keep a buffer of their own, and «What the client sees» beside it. The internal statuses
 * are their own piece.
 */
export function SettingsRulesPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <RulesSection slug={workspace.slug} name={workspace.name} />
}

function RulesSection({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations('settings')
  const sdk = useSdk()
  const rules = useRulesForm(slug, true)
  // the query the form reads: online booking itself is Business profile's switch
  const stored = useQuery(sdk.settings.rules(slug))
  const paused = stored.data?.onlineEnabled === false
  const ownBuffers = useOwnBuffers(slug)
  const lead = t('rules.lead')

  if (!rules)
    return (
      <SettingsPage section="rules" lead={lead}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const save = async () => {
    if (await rules.save()) toast(t('save.saved'))
  }

  return (
    <SettingsPage section="rules" lead={lead} aside={<RulesPreview slug={slug} name={name} form={rules.form} paused={paused} />}>
      {paused && (
        <Callout tone="neutral" size="s" icon={<Info aria-hidden />} live={false} className="mb-6">
          {t.rich('rules.paused', {
            link: (words) => (
              <Link to="/w/$slug/settings/profile" params={{ slug }} className={textLink}>
                {words}
              </Link>
            ),
          })}
        </Callout>
      )}
      <BookingRulesForm rules={rules} bufferNote={ownBuffers} />
      {rules.dirty && (
        <SaveBar
          message={t('save.question')}
          label={t('save.unsaved')}
          discardLabel={t('save.discard')}
          saveLabel={t('save.save')}
          savingLabel={t('save.saving')}
          onDiscard={rules.discard}
          onSave={() => void save()}
          invalid={!rules.valid}
          saving={rules.saving}
          // on a phone above the shell's tab bar, where its toasts sit too (B-Settings `.sbar` under 768)
          className="max-sm:bottom-[var(--toast-bottom,12px)]"
        />
      )}
    </SettingsPage>
  )
}

/**
 * «Set per service: Hair colouring — 15 min · Services»: the services whose own buffer replaces the business's, with
 * the way to Services; nothing when none has one.
 */
function useOwnBuffers(slug: string): ReactNode {
  const t = useTranslations('settings.rules')
  const label = useRuleLabels()
  const locale = useLocale()
  const sdk = useSdk()
  const menu = useQuery(sdk.settings.menu(slug))
  const own = (menu.data?.groups ?? [])
    .flatMap((g) => g.services)
    .flatMap((s) =>
      s.bufferMin === null ? [] : [t('ownBuffer', { service: localized(s.name, locale), buffer: label.buffer(s.bufferMin) })],
    )
  if (!own.length) return null
  return t.rich('ownBuffers', {
    list: new Intl.ListFormat(locale, { type: 'unit', style: 'short' }).format(own),
    link: (words) => (
      <Link to="/w/$slug/settings/services" params={{ slug }} className={textLink}>
        {words}
      </Link>
    ),
  })
}
