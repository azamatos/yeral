import { useMutation, useQuery } from '@tanstack/react-query'
import { adminLoginSchema, type AdminMember, type AdminSetupLink } from '@yeral/contract/admin'
import { Button } from '@yeral/ui/button'
import { CopyField } from '@yeral/ui/copy-field'
import { EmptyState } from '@yeral/ui/empty-state'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalClose, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { Pill, type PillProps } from '@yeral/ui/pill'
import { Skeleton } from '@yeral/ui/skeleton'
import { CellNote, Table, TableCell, TableColumnHeader, TableFrame, TableHeader, TableRow } from '@yeral/ui/table'
import { toast } from '@yeral/ui/toast'
import { Plus, Users } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { TeamPage } from '@/widgets/team-shell'

const COLUMNS = 'minmax(200px, 2fr) 110px minmax(150px, 1fr) 240px'
const STAMP = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' } as const
const STATUS_TONES: Record<AdminMember['status'], PillProps['tone']> = { invited: 'warning', active: 'success', disabled: 'slate' }

type Asking = { kind: 'reset' | 'disable'; member: AdminMember } | { kind: 'invite' } | null

/**
 * `/team` (ADR 0026): the Ýeral team's accounts. One role (Q-011), so anyone adds a teammate, starts one again from a
 * new setup link, or turns one off. Never oneself: an active account always stays.
 */
export function TeamMembersPage() {
  const t = useTranslations('team')
  const sdk = useSdk()
  const errorText = useErrorText()
  const team = useQuery(sdk.admin.team())
  const me = useQuery(sdk.admin.me())
  const [asking, setAsking] = useState<Asking>(null)
  const [link, setLink] = useState<AdminSetupLink | null>(null)
  return (
    <TeamPage
      title={t('title')}
      actions={
        <Button variant="primary" size="s" onClick={() => setAsking({ kind: 'invite' })}>
          <Plus aria-hidden />
          {t('invite')}
        </Button>
      }
    >
      {team.error ? (
        <EmptyState icon={<Users />} title={errorText(team.error)} />
      ) : !team.data ? (
        <Skeleton className="h-56" />
      ) : (
        <TableFrame>
          <Table columns={COLUMNS} aria-label={t('title')}>
            <TableHeader>
              <TableColumnHeader>{t('columns.person')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.status')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.lastSignIn')}</TableColumnHeader>
              <TableColumnHeader>{t('columns.actions')}</TableColumnHeader>
            </TableHeader>
            {team.data.items.map((member) => (
              <MemberRow key={member.id} member={member} own={member.id === me.data?.id} onAsk={setAsking} />
            ))}
          </Table>
        </TableFrame>
      )}
      {asking?.kind === 'invite' && (
        <InviteModal
          onClose={() => setAsking(null)}
          onLink={(made) => {
            setAsking(null)
            setLink(made)
          }}
        />
      )}
      {asking?.kind === 'reset' && (
        <ResetModal
          member={asking.member}
          onClose={() => setAsking(null)}
          onLink={(made) => {
            setAsking(null)
            setLink(made)
          }}
        />
      )}
      {asking?.kind === 'disable' && <DisableModal member={asking.member} onClose={() => setAsking(null)} />}
      {link && <LinkModal link={link} onClose={() => setLink(null)} />}
    </TeamPage>
  )
}

function MemberRow({ member, own, onAsk }: { member: AdminMember; own: boolean; onAsk: (asking: Asking) => void }) {
  const t = useTranslations('team')
  const format = useFormatter()
  return (
    <TableRow>
      <TableCell>
        <span className="font-semibold">{own ? `${member.name} (${t('you')})` : member.name}</span>
        <CellNote>{member.login}</CellNote>
      </TableCell>
      <TableCell className="items-start">
        <Pill tone={STATUS_TONES[member.status]}>{t(`status.${member.status}`)}</Pill>
      </TableCell>
      <TableCell>
        {member.lastSignInAt ? format.dateTime(member.lastSignInAt, STAMP) : t('never')}
        {member.setupExpiresAt && <CellNote>{t('linkUntil', { when: format.dateTime(member.setupExpiresAt, STAMP) })}</CellNote>}
      </TableCell>
      <TableCell className="flex-row gap-2">
        {!own && (
          <>
            <Button size="s" onClick={() => onAsk({ kind: 'reset', member })}>
              {t('reset')}
            </Button>
            {member.status !== 'disabled' && (
              <Button size="s" variant="ghost" onClick={() => onAsk({ kind: 'disable', member })}>
                {t('disable')}
              </Button>
            )}
          </>
        )}
      </TableCell>
    </TableRow>
  )
}

function InviteModal({ onClose, onLink }: { onClose: () => void; onLink: (link: AdminSetupLink) => void }) {
  const t = useTranslations('team')
  const sdk = useSdk()
  const errorText = useErrorText()
  const invite = useMutation(sdk.admin.invite())
  const [login, setLogin] = useState('')
  const [name, setName] = useState('')
  const [tried, setTried] = useState(false)
  const badLogin = !adminLoginSchema.safeParse(login).success

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (!badLogin) invite.mutate({ login, name }, { onSuccess: onLink })
  }

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader title={t('inviteTitle')} closeLabel={t('close')} />
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={t('login')} hint={t('loginHint')} error={tried && badLogin ? t('loginHint') : undefined}>
            <Input value={login} onChange={(e) => setLogin(e.target.value)} autoCapitalize="none" autoComplete="off" required />
          </Field>
          <Field label={t('name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
          </Field>
          {invite.error && <FieldMessage>{errorText(invite.error)}</FieldMessage>}
          <ModalActions>
            <ModalClose asChild>
              <Button>{t('cancel')}</Button>
            </ModalClose>
            <Button type="submit" variant="primary" loading={invite.isPending}>
              {t('add')}
            </Button>
          </ModalActions>
        </form>
      </ModalContent>
    </Modal>
  )
}

function ResetModal({ member, onClose, onLink }: { member: AdminMember; onClose: () => void; onLink: (link: AdminSetupLink) => void }) {
  const t = useTranslations('team')
  const sdk = useSdk()
  const errorText = useErrorText()
  const reset = useMutation(sdk.admin.resetMember())
  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader title={t('resetTitle', { name: member.name })} closeLabel={t('close')} />
        <ModalDescription>{t('resetLead')}</ModalDescription>
        {reset.error && <FieldMessage>{errorText(reset.error)}</FieldMessage>}
        <ModalActions>
          <ModalClose asChild>
            <Button>{t('cancel')}</Button>
          </ModalClose>
          <Button variant="danger" loading={reset.isPending} onClick={() => reset.mutate(member.id, { onSuccess: onLink })}>
            {t('reset')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}

function DisableModal({ member, onClose }: { member: AdminMember; onClose: () => void }) {
  const t = useTranslations('team')
  const sdk = useSdk()
  const errorText = useErrorText()
  const disable = useMutation(sdk.admin.disableMember())
  const confirm = () =>
    disable.mutate(member.id, {
      onSuccess: () => {
        toast(t('turnedOff', { name: member.name }))
        onClose()
      },
    })
  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader title={t('disableTitle', { name: member.name })} closeLabel={t('close')} />
        <ModalDescription>{t('disableLead')}</ModalDescription>
        {disable.error && <FieldMessage>{errorText(disable.error)}</FieldMessage>}
        <ModalActions>
          <ModalClose asChild>
            <Button>{t('cancel')}</Button>
          </ModalClose>
          <Button variant="danger" loading={disable.isPending} onClick={confirm}>
            {t('disable')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}

/** Shown once: the api keeps only its hash. */
function LinkModal({ link, onClose }: { link: AdminSetupLink; onClose: () => void }) {
  const t = useTranslations('team')
  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent>
        <ModalHeader title={t('linkTitle')} closeLabel={t('close')} />
        <ModalDescription>{t('linkLead')}</ModalDescription>
        <CopyField value={link.url} label={t('link')} copy={{ copy: t('copy'), copied: t('copied') }} />
        <ModalActions>
          <Button variant="primary" onClick={onClose}>
            {t('close')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}
