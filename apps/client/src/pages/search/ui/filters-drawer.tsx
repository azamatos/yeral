import { Button } from '@yeral/ui/button'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Switch } from '@yeral/ui/switch'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { TOP_RATING, type SearchAddress } from '../model/search'

type Filters = Pick<SearchAddress, 'from' | 'to' | 'rating' | 'open' | 'women'>

const amount = (text: string) => (text.trim() && Number.isFinite(Number(text)) ? Math.max(0, Math.floor(Number(text))) : undefined)

/**
 * The filters (book C-03; not drawn, so the booking drawer's pattern): the price range, rating, open now and women only.
 * Nothing changes until «Show results».
 */
export function FiltersDrawer({
  address,
  onApply,
  onClose,
}: {
  address: SearchAddress
  onApply: (filters: Filters) => void
  onClose: () => void
}) {
  const t = useTranslations('search.filters')
  const [from, setFrom] = useState(address.from?.toString() ?? '')
  const [to, setTo] = useState(address.to?.toString() ?? '')
  const [rating, setRating] = useState(address.rating !== undefined)
  const [open, setOpen] = useState(!!address.open)
  const [women, setWomen] = useState(!!address.women)

  const apply = () =>
    onApply({
      from: amount(from),
      to: amount(to),
      rating: rating ? TOP_RATING : undefined,
      open: open ? true : undefined,
      women: women ? true : undefined,
    })
  const clear = () => onApply({ from: undefined, to: undefined, rating: undefined, open: undefined, women: undefined })

  return (
    <Drawer open onOpenChange={(next) => !next && onClose()}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader title={t('title')} closeLabel={t('close')} />
        <DrawerBody>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('from')}>
              <Input inputMode="numeric" autoComplete="off" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t('to')}>
              <Input inputMode="numeric" autoComplete="off" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <FilterSwitch label={t('rating')} checked={rating} onChange={setRating} />
          <FilterSwitch label={t('openNow')} checked={open} onChange={setOpen} />
          <FilterSwitch label={t('women')} checked={women} onChange={setWomen} />
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={clear}>
            {t('clear')}
          </Button>
          <Button variant="primary" className="ml-auto" onClick={apply}>
            {t('apply')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function FilterSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  const id = useId()
  return (
    <div className="flex items-center justify-between gap-3">
      <span id={id} className="text-body text-n-900">
        {label}
      </span>
      <Switch aria-labelledby={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}
