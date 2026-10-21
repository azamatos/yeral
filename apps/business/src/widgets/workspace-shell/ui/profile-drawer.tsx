import { useMutation } from '@tanstack/react-query'
import { NAME_MAX } from '@yeral/domain/names'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { toast } from '@yeral/ui/toast'
import { Info, LogOut } from 'lucide-react'
import { useState, type FormEvent, type RefObject } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeralLink } from '@/features/contact-yeral'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { useAccount } from '../model/use-account'
import { useWorkspace } from '../model/use-workspace'
import { ChangePhone } from './change-phone'
import { LeaveConfirm } from './leave-confirm'
import { ProfilePhoto } from './profile-photo'

/**
 * My profile (book B-12; B-Shell, DS-Business 09 ProfileDrawer): the person, not the business, the same in every
 * workspace. The name (first and optional last, book Q-156) saves with Save; the photo comes with the api's photo
 * upload; the phone is the login, changed in place with a code (B-13) when the account may; My workspaces lists each
 * with the person's level there; the owner can't leave (the owner box), anyone else may leave the workspace on screen
 * (B-15). A right drawer 480 (no scrim from 1280), a bottom sheet on phones.
 */
export function ProfileDrawer({
  open,
  onOpenChange,
  opener,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What opened it (the account menu's button, More): the focus goes back there. */
  opener?: RefObject<HTMLElement | null>
}) {
  const t = useTranslations()
  return (
    <Drawer open={open} onOpenChange={onOpenChange} scrim="auto" returnFocus={opener}>
      <DrawerContent>
        <DrawerHeader
          title={t('shell.profile.title')}
          subtitle={t('shell.profile.lead', { brand: t('common.brand') })}
          closeLabel={t('shell.profile.close')}
        />
        {/* a fresh form each time it opens: what's on screen is the account now */}
        {open && <Profile onDone={() => onOpenChange(false)} />}
      </DrawerContent>
    </Drawer>
  )
}

function Profile({ onDone }: { onDone: () => void }) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const { me, workspaces, workspace } = useWorkspace()
  const account = useAccount()
  const update = useMutation(sdk.me.update())
  const [first, setFirst] = useState(me?.firstName ?? '')
  const [last, setLast] = useState(me?.surname ?? '')
  const [missing, setMissing] = useState(false)
  if (!me || !workspace || !workspaces) return null
  const owner = workspace.level === 'owner'

  const save = (e: FormEvent) => {
    e.preventDefault()
    const firstName = first.trim()
    if (!firstName) return setMissing(true)
    const surname = last.trim() || null
    if (firstName === me.firstName && surname === me.surname) return onDone()
    update.mutate(
      { firstName, surname },
      {
        onSuccess: () => {
          toast(t('shell.profile.saved'))
          onDone()
        },
        onError: (error) => void toast(errorText(error)),
      },
    )
  }

  return (
    <>
      <DrawerBody>
        <form id="my-profile" noValidate onSubmit={save} className="flex flex-col gap-6">
          <ProfilePhoto name={account.name} />
          <Field label={t('shell.profile.first')} error={missing ? t('shell.profile.firstRequired') : undefined}>
            <Input
              value={first}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              onChange={(e) => {
                setFirst(e.target.value)
                setMissing(false)
              }}
            />
          </Field>
          <Field
            label={t.rich('shell.profile.last', { optional: (chunks) => <span className="font-normal text-n-600">{chunks}</span> })}
            hint={t('shell.profile.nameHint')}
          >
            <Input value={last} maxLength={NAME_MAX} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} />
          </Field>
        </form>
        <ChangePhone phone={me.phone} canChange={me.canChangePhone} />
        <div role="separator" className="h-px flex-none bg-n-200" />
        <section aria-labelledby="my-workspaces" className="flex flex-col gap-2.5">
          <h3 id="my-workspaces" className="m-0 text-[15px] leading-5 font-semibold text-n-900">
            {t('shell.profile.workspaces')}
          </h3>
          <ul className="m-0 flex list-none flex-col p-0">
            {workspaces.items.map((w) => (
              <li key={w.slug} className="flex min-h-15 items-center gap-3 border-b border-n-200 py-2 first:border-t">
                <Avatar decorative name={w.name} src={w.logo?.url} size={32} shape="square" tone="neutral" letters={1} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-small font-semibold text-n-900">{w.name}</span>
                  <span className="truncate text-micro text-n-600">{t(`levels.${w.level}`)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        {owner && (
          <div className="flex items-start gap-2.5 rounded-m bg-group px-4 py-3 text-small text-n-900">
            <Info aria-hidden className="mt-0.5 size-4.5 flex-none text-n-600" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="m-0">{t('shell.profile.ownerCantLeave', { business: workspace.name, brand: t('common.brand') })}</p>
              <ContactYeralLink />
            </div>
          </div>
        )}
      </DrawerBody>
      <DrawerFooter className="items-center [&>*]:flex-none">
        {!owner && (
          <LeaveConfirm workspace={workspace} onLeft={onDone}>
            <Button variant="danger-ghost" className="-ml-1.5 px-1.5 text-small">
              <LogOut aria-hidden />
              {t('shell.profile.leave')}
            </Button>
          </LeaveConfirm>
        )}
        <Button type="submit" form="my-profile" variant="primary" loading={update.isPending} className="ml-auto">
          {t('shell.profile.save')}
        </Button>
      </DrawerFooter>
    </>
  )
}
