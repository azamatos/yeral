import type { CalendarBooking } from '@yeral/contract/calendar'
import type { ComplaintType } from '@yeral/domain/model'
import { Button } from '@yeral/ui/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useReportActions } from '../model/use-report-actions'
import { ReportOtherForm } from './report-other-form'

/**
 * «Report ▾» in the drawer's footer (B-Calendar `panel=report-menu | report-noshow | report-added`, book B-28): the
 * kinds the booking takes now (`reportKinds`), each with what it does; No-show, Came late and Rude behaviour file at
 * once with a toast and Undo, «Other…» asks «What happened?» first. With an earlier report, No-show says it replaces it.
 */
export function ReportMenu({
  slug,
  booking: b,
  now,
  kinds,
  context,
}: {
  slug: string
  booking: CalendarBooking
  now: number
  /** What may be reported now, in the menu's order (empty: the menu isn't shown). */
  kinds: ComplaintType[]
  /** The booking in one line for the form («Gözel Annaýewa · Women’s haircut · Wednesday, 14 October · 10:00–11:00»). */
  context: string
}) {
  const t = useTranslations('bookingDrawer.report')
  const report = useReportActions(slug, now)
  const [other, setOther] = useState(false)
  if (!kinds.length) return null
  const pick = (type: ComplaintType) => {
    if (type === 'other') setOther(true)
    else report.file(b, { type })
  }
  return (
    <>
      <Menu>
        <MenuTrigger asChild>
          <Button variant="ghost" disabled={report.filing}>
            {t('report')}
            <ChevronDown aria-hidden strokeWidth={1.75} />
          </Button>
        </MenuTrigger>
        <MenuContent side="top" align="start" aria-label={t('report')}>
          {kinds.map((type) => (
            <MenuItem key={type} className="h-auto min-h-10 items-start py-1.5" onSelect={() => pick(type)}>
              <span className="flex min-w-0 flex-col">
                <span className="text-small font-semibold">{type === 'other' ? t('otherMenu') : t(`types.${type}`)}</span>
                <span className="text-dense text-n-600">
                  {type === 'noshow' && b.complaint ? t('captions.noshowReplaces') : t(`captions.${type}`)}
                </span>
              </span>
            </MenuItem>
          ))}
        </MenuContent>
      </Menu>
      {other && (
        <ReportOtherForm
          context={context}
          pending={report.filing}
          onOpenChange={setOther}
          onSave={(text) => report.file(b, { type: 'other', text }, () => setOther(false))}
        />
      )}
    </>
  )
}
