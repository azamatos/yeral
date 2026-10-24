import { useQueryClient } from '@tanstack/react-query'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { ADDRESS_MAX, AddressFields, ENTRANCE_MAX, FLOOR_MAX, useAddressForm } from '@/features/edit-address'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { StepHeader, type StepAction } from './setup-frame'

/**
 * Step 3, «Where will clients find you?» (B-Onboarding `isAddr`, book B-03): the address's fields
 * (`features/edit-address`: the city, the address searched and picked, the pin or the approximate circle, the floor and
 * the entrance note). Its `save` puts them into the draft's profile. A hook, so the wizard's frame stays the same
 * element around every step; `on` while the step shows (its data loads then, and what's typed stays while the wizard
 * is on another step).
 */
export function useAddressStep(slug: string, on: boolean): { body: ReactNode; action: StepAction } {
  const t = useTranslations('setup.address')
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const address = useAddressForm(slug, on)

  if (!address)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      // loading isn't saving: Continue waits, nothing is announced
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
    }

  const { problem } = address

  /** The address into the draft's profile when it's valid and changed; false when it failed (the person heard why). */
  const save = async (): Promise<boolean> => {
    if (!address.edited || problem) return true
    try {
      await address.save()
      // the profile's save refreshes the settings, not the draft's summary in the step list
      await queryClient.invalidateQueries({ queryKey: sdk.setup.mine().queryKey })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }

  const hint =
    problem === 'long'
      ? t('hintLong', { max: ADDRESS_MAX })
      : problem === 'entrance'
        ? t('hintEntrance', { max: ENTRANCE_MAX })
        : problem === 'floor'
          ? t('hintFloor', { max: FLOOR_MAX })
          : t('hintPick')

  const body = (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="address" title={t('title')} lead={t('lead')} />
      <AddressFields address={address} />
    </section>
  )

  return {
    body,
    action: { valid: !problem, hint: problem ? hint : undefined, busy: address.saving, ready: true, save },
  }
}
