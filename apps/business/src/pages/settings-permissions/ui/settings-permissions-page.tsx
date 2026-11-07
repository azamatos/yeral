import { Link } from '@tanstack/react-router'
import { LEVELS } from '@yeral/domain/permissions'
import { cn } from '@yeral/ui/cn'
import { InfoTip } from '@yeral/ui/info-tip'
import { useMediaQuery } from '@yeral/ui/media-query'
import { textLink } from '@yeral/ui/text-link'
import { Check } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { FOOTNOTES, PERMISSION_ROWS, type Footnote, type PermissionCell, type PermissionRow } from '../model/rows'

// What they can do · Owner · Admin · Specialist (B7-Team `.mxr`): three equal columns, rows 48, the header 40
const COLUMNS = 'grid grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(0,1fr))] items-center gap-x-4 px-4'

/**
 * Settings → Permissions (design v0.7 · B7-Team B9, book chapter 3): what each access level may do, read-only, as the
 * api enforces it; the levels themselves are given in Team. A matrix of symbols — ✓, —, Own, View — with a key above,
 * footnote numbers where a nuance needs words and the notes under the table; an ⓘ per row says what the action
 * covers. Under 768 one card per action with the three levels as rows and the card's own note.
 */
export function SettingsPermissionsPage() {
  const t = useTranslations()
  const p = useTranslations('settings.permissions')
  const { slug } = useWorkspace()
  const wide = useMediaQuery('(min-width: 768px)')
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
      <div className="flex flex-col gap-4">
        <Key />
        {wide ? (
          <div role="table" aria-label={p('table')} className="rounded-m border border-n-200 bg-n-0">
            <div role="row" className={cn(COLUMNS, 'min-h-10')}>
              <span role="columnheader" className="text-micro font-semibold text-n-500">
                {p('what')}
              </span>
              {LEVELS.map((level) => (
                <span key={level} role="columnheader" className="text-center text-dense font-semibold text-n-900">
                  {t(`levels.${level}`)}
                </span>
              ))}
            </div>
            {PERMISSION_ROWS.map((row) => (
              <div key={row.id} role="row" className={cn(COLUMNS, 'min-h-12 border-t border-n-200 text-small text-n-900')}>
                <span role="rowheader" className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate">{p(`rows.${row.id}`)}</span>
                  <About row={row} />
                </span>
                {LEVELS.map((level) => (
                  <span key={level} role="cell" className="flex min-w-0 items-center justify-center">
                    <Symbol value={row[level]} note={row.notes?.[level]} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {PERMISSION_ROWS.map((row) => {
              const notes = [...new Set(LEVELS.flatMap((level) => row.notes?.[level] ?? []))]
              return (
                <section
                  key={row.id}
                  aria-label={p(`rows.${row.id}`)}
                  className="flex flex-col rounded-card border border-n-200 bg-n-0 px-4 pt-3.5 pb-2.5"
                >
                  <span className="flex items-center gap-1.5 pb-1.5 text-[15px]/5 font-semibold text-n-900">
                    {p(`rows.${row.id}`)}
                    <About row={row} />
                  </span>
                  {LEVELS.map((level) => (
                    <span key={level} className="flex h-8 items-center justify-between border-t border-n-100 text-small text-n-600">
                      {t(`levels.${level}`)}
                      <span className="flex items-center pr-2.5">
                        <Symbol value={row[level]} note={row.notes?.[level]} />
                      </span>
                    </span>
                  ))}
                  {notes.map((n) => (
                    <span key={n} className="flex gap-1 pt-1.5 pb-0.5 text-micro text-n-500">
                      <NoteNumber n={n} />
                      {p(`notes.n${n}`)}
                    </span>
                  ))}
                </section>
              )
            })}
          </div>
        )}
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-dense text-n-600">
          {wide &&
            FOOTNOTES.map((n) => (
              <li key={n} className="flex gap-1.5">
                <NoteNumber n={n} className="min-w-2.5 text-micro/4.5" />
                <span>{p(`notes.n${n}`)}</span>
              </li>
            ))}
          <li className="flex gap-1.5">
            {wide && <span className="w-2.5 flex-none" />}
            {p('noApp')}
          </li>
        </ul>
      </div>
    </SettingsPage>
  )
}

/** The key above the matrix (B7-Team `.lg`): the four symbols and what each means. */
function Key() {
  const p = useTranslations('settings.permissions')
  return (
    <div aria-label={p('key.label')} className="flex flex-wrap items-center gap-x-6 gap-y-2 text-dense text-n-600">
      <span className="inline-flex items-center gap-2">
        <Check aria-hidden strokeWidth={2} className="size-4.5 flex-none text-n-900" />
        {p('key.yes')}
      </span>
      <span className="inline-flex items-center gap-2">
        <Chip value="own" />
        {p('key.own')}
      </span>
      <span className="inline-flex items-center gap-2">
        <Chip value="view" />
        {p('key.view')}
      </span>
      <span className="inline-flex items-center gap-2">
        <Dash />
        {p('key.no')}
      </span>
    </div>
  )
}

/** The ⓘ of a row that covers more than its name says. */
function About({ row }: { row: PermissionRow }) {
  const p = useTranslations('settings.permissions')
  if (!row.about) return null
  return (
    <InfoTip label={p('aboutLabel', { row: p(`rows.${row.id}`) })} align="start">
      {p(`about.${row.about}`)}
    </InfoTip>
  )
}

/** A cell: ✓, —, an Own or View chip, with its footnote number raised beside it; each read as words too. */
function Symbol({ value, note }: { value: PermissionCell; note?: Footnote }) {
  const p = useTranslations('settings.permissions')
  return (
    <span className="relative inline-flex items-center">
      {value === 'yes' ? (
        <>
          <Check aria-hidden strokeWidth={2} className="size-4.5 flex-none text-n-900" />
          <span className="sr-only">{p('yes')}</span>
        </>
      ) : value === 'no' ? (
        <>
          <Dash />
          <span className="sr-only">{p('no')}</span>
        </>
      ) : (
        <Chip value={value} />
      )}
      {note && <NoteNumber n={note} className="absolute -top-1.5 left-full ml-0.5 text-[11px]/3.5" />}
    </span>
  )
}

/** «Own» (n-100 fill) or «View» (white, n-300 line, n-600) — 24 high, 12/16 600 (B7-Team `.chp`). */
function Chip({ value }: { value: 'own' | 'view' }) {
  const p = useTranslations('settings.permissions')
  return (
    <span
      className={cn(
        'inline-flex h-6 flex-none items-center rounded-pill border px-2.25 text-micro font-semibold whitespace-nowrap',
        value === 'own' ? 'border-transparent bg-n-100 text-n-900' : 'border-n-300 bg-n-0 text-n-600',
      )}
    >
      {p(`cells.${value}`)}
    </span>
  )
}

function Dash() {
  const p = useTranslations('settings.permissions')
  return (
    <span aria-hidden className="inline-flex w-6 justify-center text-[16px]/5 text-n-500">
      {p('noMark')}
    </span>
  )
}

/** A footnote's number, 700 in the accent (B7-Team `.fnm`). */
function NoteNumber({ n, className }: { n: Footnote; className?: string }) {
  const p = useTranslations('settings.permissions')
  return (
    <span aria-label={p('note', { n })} className={cn('flex-none font-bold text-a-600', className)}>
      {n}
    </span>
  )
}
