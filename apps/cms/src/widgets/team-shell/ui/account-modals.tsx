import { useMutation } from '@tanstack/react-query'
import { Button } from '@yeral/ui/button'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalClose, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { RecoveryCodes } from '@/shared/ui'

/** «Change password» in the account menu; the api ends the account's other sessions. */
export function PasswordModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('account')
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader title={t('passwordTitle')} closeLabel={t('close')} />
        <ModalDescription>{t('passwordLead')}</ModalDescription>
        {/* a fresh form each time, so nothing typed stays behind */}
        {open && <PasswordForm onDone={() => onOpenChange(false)} />}
      </ModalContent>
    </Modal>
  )
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations('account')
  const sdk = useSdk()
  const errorText = useErrorText()
  const change = useMutation(sdk.admin.changePassword())
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    change.mutate(
      { password, newPassword },
      {
        onSuccess: () => {
          toast(t('passwordSaved'))
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label={t('current')}>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </Field>
      <Field label={t('new')}>
        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
      </Field>
      {change.error && <FieldMessage>{errorText(change.error)}</FieldMessage>}
      <ModalActions>
        <ModalClose asChild>
          <Button>{t('cancel')}</Button>
        </ModalClose>
        <Button type="submit" variant="primary" loading={change.isPending}>
          {t('save')}
        </Button>
      </ModalActions>
    </form>
  )
}

/** «New recovery codes»: the authenticator's current code, then the new ones, shown once. */
export function RecoveryModal({ open, onOpenChange, left }: { open: boolean; onOpenChange: (open: boolean) => void; left: number }) {
  const t = useTranslations('account')
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent>
        <ModalHeader title={t('recoveryTitle')} closeLabel={t('close')} />
        {open && <RecoveryForm left={left} onDone={() => onOpenChange(false)} />}
      </ModalContent>
    </Modal>
  )
}

function RecoveryForm({ left, onDone }: { left: number; onDone: () => void }) {
  const t = useTranslations('account')
  const sdk = useSdk()
  const errorText = useErrorText()
  const make = useMutation(sdk.admin.newRecoveryCodes())
  const [code, setCode] = useState('')

  if (make.data)
    return (
      <>
        <ModalDescription>{t('recoveryDone')}</ModalDescription>
        <RecoveryCodes codes={make.data.codes} />
        <ModalActions>
          <Button variant="primary" onClick={onDone}>
            {t('close')}
          </Button>
        </ModalActions>
      </>
    )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    make.mutate({ code }, { onError: () => setCode('') })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <ModalDescription>{t('recoveryLead', { left })}</ModalDescription>
      <Field label={t('code')}>
        <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
      </Field>
      {make.error && <FieldMessage>{errorText(make.error)}</FieldMessage>}
      <ModalActions>
        <ModalClose asChild>
          <Button>{t('cancel')}</Button>
        </ModalClose>
        <Button type="submit" variant="primary" loading={make.isPending}>
          {t('make')}
        </Button>
      </ModalActions>
    </form>
  )
}
