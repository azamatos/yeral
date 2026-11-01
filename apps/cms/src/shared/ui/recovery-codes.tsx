import { CopyField } from '@yeral/ui/copy-field'
import { useTranslations } from 'use-intl'

/** The 10 one-time codes, shown once: in two columns, and all of them to copy at once. */
export function RecoveryCodes({ codes }: { codes: string[] }) {
  const t = useTranslations('recovery')
  return (
    <div className="flex flex-col gap-3">
      <ul aria-label={t('label')} className="grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-m bg-group p-4 font-mono text-small text-n-900">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <CopyField
        variant="inline"
        value={codes.join('\n')}
        display={t('copy')}
        label={t('copy')}
        copy={{ copy: t('copy'), copied: t('copied') }}
      />
    </div>
  )
}
