import { SLUG_MAX, SLUG_MIN } from '@yeral/domain/setup'
import { Field } from '@yeral/ui/field'
import { InputGroup } from '@yeral/ui/input-group'
import { textLink } from '@yeral/ui/text-link'
import { useTranslations } from 'use-intl'
import { pageLink } from '@/shared/config'
import { typedAddress } from '../model/address'
import type { PageAddressState } from '../model/check'

/**
 * The page address field (B-Settings and B-Onboarding draw the address, not a field for it: the nearest drawn pattern,
 * InputGroup's prefix box): `yeral.app/b/` before what's typed (lower case, spaces as hyphens), what the check says
 * under it, and «Use …» for a free address like a taken or reserved one.
 */
export function PageAddressField({
  value,
  onChange,
  state,
  label,
  autoFocus,
}: {
  value: string
  onChange: (slug: string) => void
  state: PageAddressState
  label?: string
  autoFocus?: boolean
}) {
  const t = useTranslations('pageAddress')
  const problem = state.status === 'problem' ? state : null
  const message = problem ? (
    <>
      {problem.problem === 'short'
        ? t('short', { min: SLUG_MIN })
        : problem.problem === 'long'
          ? t('long', { max: SLUG_MAX })
          : t(problem.problem)}
      {problem.suggestion && (
        <>
          {' '}
          <button type="button" className={textLink} onClick={() => onChange(problem.suggestion!)}>
            {t('use', { slug: problem.suggestion })}
          </button>
        </>
      )}
    </>
  ) : state.status === 'free' ? (
    t('free')
  ) : state.status === 'unknown' ? (
    t('checkFailed')
  ) : undefined
  return (
    <Field
      label={label ?? t('label')}
      hint={t('hint')}
      status={problem ? 'error' : state.status === 'free' ? 'success' : state.status === 'unknown' ? 'warning' : undefined}
      message={message}
    >
      <InputGroup
        // the page's address up to its last part, as the link shows it
        prefix={pageLink('').display}
        value={value}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        // past the limit can be typed, so the message says what's too long
        maxLength={SLUG_MAX * 2}
        onChange={(e) => {
          const input = e.target
          const at = input.selectionStart
          onChange(typedAddress(input.value))
          // rewritten letter for letter (lower case, hyphens): the caret stays where it was
          requestAnimationFrame(() => {
            if (at !== null && document.activeElement === input) input.setSelectionRange(at, at)
          })
        }}
      />
    </Field>
  )
}
