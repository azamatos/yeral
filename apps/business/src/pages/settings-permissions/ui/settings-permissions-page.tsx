import { Link } from '@tanstack/react-router'
import { LEVELS, type Level } from '@yeral/domain/permissions'
import { cn } from '@yeral/ui/cn'
import { textLink } from '@yeral/ui/text-link'
import { Check } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { PERMISSION_ROWS, type PermissionCell } from '../model/rows'

// What · Owner · Admin · Specialist (B-Team `.mx-r`); under 768 the name on its own line and two columns under it
const ROW =
  'grid grid-cols-2 items-center gap-x-3 gap-y-2 border-b border-n-200 px-4 py-3 text-small text-n-900 last:border-b-0 sm:min-h-14 sm:grid-cols-[minmax(0,1fr)_72px_88px_minmax(160px,248px)] sm:gap-y-0 sm:px-5 sm:py-2'
const LABEL = 'text-label text-n-500 uppercase'

/**
 * Settings → Permissions (B-Team `tab=permissions`, design §28.1 «Fixed permissions»): what each access level may do,
 * read-only, as the api enforces it; the levels themselves are given in Team. Under 768 each row stacks, every cell
 * with its level's name. Specialists without the app never sign in, so the table doesn't apply to them.
 */
export function SettingsPermissionsPage() {
  const t = useTranslations()
  const p = useTranslations('settings.permissions')
  const { slug } = useWorkspace()
  return (
    <SettingsPage
      section="permissions"
      lead={p.rich('lead', {
        team: (chunks) => (
          <Link to="/w/$slug/settings/team" params={{ slug }} className={textLink}>
            {chunks}
          </Link>
        ),
      })}
    >
      <div role="table" aria-label={p('table')} className="overflow-hidden rounded-card border border-n-200 bg-n-0">
        <div role="row" className={cn(ROW, 'hidden min-h-11 bg-n-50 py-0 sm:grid sm:py-0')}>
          <span role="columnheader" className={LABEL}>
            {p('what')}
          </span>
          {LEVELS.map((level) => (
            <span
              key={level}
              role="columnheader"
              className={cn(LABEL, 'flex', level === 'specialist' ? 'justify-start' : 'justify-center')}
            >
              {t(`levels.${level}`)}
            </span>
          ))}
        </div>
        {PERMISSION_ROWS.map((row) => (
          <div key={row.id} role="row" className={ROW}>
            <span role="rowheader" className="col-span-full min-w-0 font-semibold sm:col-span-1 sm:font-medium">
              {p(`rows.${row.id}`)}
            </span>
            {LEVELS.map((level) => (
              <Cell key={level} level={level} value={row[level]} />
            ))}
          </div>
        ))}
      </div>
      <p className="m-0 pt-3 text-dense text-n-600">{p('noApp')}</p>
    </SettingsPage>
  )
}

/** A cell: a check (yes), a dash (no) or the narrower reach in words; under 768 led by its level's name. */
function Cell({ level, value }: { level: Level; value: PermissionCell }) {
  const t = useTranslations()
  const p = useTranslations('settings.permissions')
  const words = level === 'specialist'
  return (
    <span
      role="cell"
      className={cn('flex min-h-6 min-w-0 items-start gap-2 sm:items-center', words ? 'col-span-full sm:col-span-1' : 'sm:justify-center')}
    >
      <span aria-hidden className={cn(LABEL, 'flex-none pt-0.75 sm:hidden')}>
        {t(`levels.${level}`)}
      </span>
      {value === 'yes' ? (
        <>
          <Check aria-hidden strokeWidth={2} className="size-4.5 flex-none text-n-900" />
          <span className="sr-only">{p('yes')}</span>
        </>
      ) : value === 'no' ? (
        <>
          <span aria-hidden className="text-base leading-5 text-n-500">
            —
          </span>
          <span className="sr-only">{p('no')}</span>
        </>
      ) : (
        <span className="text-dense text-n-900">{p(`cells.${value}`)}</span>
      )}
    </span>
  )
}
