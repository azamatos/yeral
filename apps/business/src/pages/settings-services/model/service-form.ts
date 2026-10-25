import type { Menu, ServiceInput, ServiceUpdate } from '@yeral/contract/services'
import type { PriceType } from '@yeral/domain/model'
import { localized } from '@yeral/domain/model'
import { PRICE_MAX, SERVICE_MINUTES } from '@yeral/domain/services'
import { writtenIn as written } from '@/shared/lib'

type Service = Menu['groups'][number]['services'][number]
type Locale = Parameters<typeof localized>[1]

/** The drawer's name (B-Services cuts at 60; the api takes up to 80) and description (the board's counter). */
export const SERVICE_NAME_MAX = 60
export const SERVICE_DESCRIPTION_MAX = 200
export const PRICE_DIGITS = String(PRICE_MAX).length

/** «Duration»: 5 min to 4 h in 5-minute steps. */
export const DURATION_CHOICES = Array.from(
  { length: (SERVICE_MINUTES.max - SERVICE_MINUTES.min) / SERVICE_MINUTES.step + 1 },
  (_, i) => SERVICE_MINUTES.min + i * SERVICE_MINUTES.step,
)

/** «Buffer after the service»: `rule` takes Booking rules' buffer (`bufferMin` null). */
export type BufferChoice = 'rule' | number

/**
 * The service drawer's form (B-Services `.drw`): the name and description in the reader's language (one language at
 * the first release, §28.1; the market's other languages a business wrote stay), the group, length, own buffer, price,
 * who does it and online booking. `amount` is the typed figures, whole manats.
 */
export type ServiceForm = {
  name: string
  description: string
  groupId: string
  durationMin: number
  buffer: BufferChoice
  priceType: PriceType
  amount: string
  staffIds: string[]
  online: boolean
}

/** A new service (B-Services `blank`): 60 min, the rules' buffer, a fixed price to type, nobody yet, booked online. */
export function newForm(groupId: string): ServiceForm {
  return { name: '', description: '', groupId, durationMin: 60, buffer: 'rule', priceType: 'fixed', amount: '', staffIds: [], online: true }
}

export function formFrom(service: Service, locale: Locale): ServiceForm {
  return {
    name: localized(service.name, locale),
    description: service.description ? localized(service.description, locale) : '',
    groupId: service.groupId,
    durationMin: service.durationMin,
    buffer: service.bufferMin ?? 'rule',
    priceType: service.priceType,
    amount: service.priceType === 'free' || (service.priceType === 'hidden' && !service.priceAmount) ? '' : String(service.priceAmount),
    staffIds: [...service.staffIds],
    online: service.online,
  }
}

/** Fixed and «From» need a price; a price at the place may keep an amount for the totals; free has none. */
export const needsAmount = (t: PriceType) => t === 'fixed' || t === 'from'
export const takesAmount = (t: PriceType) => t !== 'free'

/**
 * What stops Save: «Enter the service name.», «Enter the price.» (a fixed or «from» price above 0), and a description
 * over its limit («Too long», design §28.5: over a limit blocks saving).
 */
export function formProblems(form: ServiceForm): { name?: true; amount?: true; description?: true } {
  const problems: { name?: true; amount?: true; description?: true } = {}
  if (!form.name.trim()) problems.name = true
  if (needsAmount(form.priceType) && !(Number(form.amount) >= 1)) problems.amount = true
  if (form.description.trim().length > SERVICE_DESCRIPTION_MAX) problems.description = true
  return problems
}

const amountOf = (form: ServiceForm) => (takesAmount(form.priceType) ? Number(form.amount) || 0 : 0)
const bufferOf = (form: ServiceForm) => (form.buffer === 'rule' ? null : form.buffer)

/** `POST …/services`: a new service, last in its group. */
export function addInput(form: ServiceForm, locale: Locale): ServiceInput {
  const description = form.description.trim()
  return {
    groupId: form.groupId,
    name: written(null, locale, form.name),
    description: description ? written(null, locale, description) : null,
    durationMin: form.durationMin,
    priceType: form.priceType,
    priceAmount: amountOf(form),
    bufferMin: bufferOf(form),
    online: form.online,
    staffIds: form.staffIds,
  }
}

/**
 * `PATCH …/services/{id}`: only what changed; nothing changed sends nothing. A description emptied goes in every
 * language (the one on screen may have been another language's, shown for want of the reader's).
 */
export function updateInput(form: ServiceForm, service: Service, locale: Locale): ServiceUpdate | null {
  const was = formFrom(service, locale)
  const update: ServiceUpdate = {}
  if (form.name.trim() !== was.name) update.name = written(service.name, locale, form.name)
  if (form.description.trim() !== was.description) {
    const description = form.description.trim()
    update.description = description ? written(service.description, locale, description) : null
  }
  if (form.groupId !== service.groupId) update.groupId = form.groupId
  if (form.durationMin !== service.durationMin) update.durationMin = form.durationMin
  if (bufferOf(form) !== service.bufferMin) update.bufferMin = bufferOf(form)
  if (form.priceType !== service.priceType) update.priceType = form.priceType
  if (amountOf(form) !== service.priceAmount) update.priceAmount = amountOf(form)
  if (form.online !== service.online) update.online = form.online
  const staff = [...form.staffIds].sort().join()
  if (staff !== [...service.staffIds].sort().join()) update.staffIds = form.staffIds
  return Object.keys(update).length ? update : null
}
