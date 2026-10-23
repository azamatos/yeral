/**
 * The services menu as the business keeps it (book B-38; `/w/{slug}/services…`): groups and services in the clients'
 * order, every language written, hidden prices with their amounts, services not booked online, and who does each.
 * The owner and administrators ("change services and prices"); a specialist gets 403.
 */
import { PRICE_TYPES } from '@yeral/domain/model'
import { z } from 'zod'
import { idSchema, localizedSchema, marketLocaleSchema, slugSchema, uniqueIdsSchema } from './common'

/** Text as written, per language (any of the market's). */
const writtenSchema = z.partialRecord(marketLocaleSchema, z.string())

export const menuServiceSchema = z
  .object({
    id: idSchema,
    groupId: idSchema,
    name: writtenSchema,
    description: writtenSchema.nullable(),
    /** 5–240 minutes in 5-minute steps. */
    durationMin: z.number().int(),
    priceType: z.enum(PRICE_TYPES),
    /** Whole manats up to 99 999; a hidden price keeps its amount for the business's revenue, free is 0. */
    priceAmount: z.number().int(),
    /** Its own buffer after it (0, 5, 10, 15, 20 or 30 minutes); null = the business's. */
    bufferMin: z.number().int().nullable(),
    /** "Onlaýn ýazylmak bolýar": off, it's not on the client page and is booked only by phone. */
    online: z.boolean(),
    /** "Kim edýär": none picked, clients can't book it. */
    staffIds: z.array(idSchema),
    /** Bookings ahead that hold it: deleting it leaves them as they are (book Q-210), so the delete step says how many. */
    futureBookings: z.number().int(),
  })
  .meta({ id: 'MenuService' })

export const menuGroupSchema = z
  .object({ id: idSchema, name: writtenSchema, services: z.array(menuServiceSchema) })
  .meta({ id: 'MenuGroup' })

export const menuSchema = z.object({ groups: z.array(menuGroupSchema) }).meta({ id: 'Menu' })
export type Menu = z.infer<typeof menuSchema>

const serviceFields = {
  groupId: idSchema,
  name: localizedSchema(80),
  description: localizedSchema(500).nullable(),
  durationMin: z.number().int(),
  priceType: z.enum(PRICE_TYPES),
  priceAmount: z.number().int(),
  bufferMin: z.number().int().nullable(),
  online: z.boolean(),
  staffIds: uniqueIdsSchema.max(100),
}

/** A new service, last in its group; without a description, its own buffer or people, and booked online. */
export const serviceInputSchema = z
  .object({
    ...serviceFields,
    description: serviceFields.description.optional(),
    bufferMin: serviceFields.bufferMin.optional(),
    online: serviceFields.online.optional(),
    staffIds: serviceFields.staffIds.optional(),
  })
  .strict()
  .meta({ id: 'ServiceInput' })

/** Change some of a service; a new group puts it last there. */
export const serviceUpdateSchema = z.object(serviceFields).partial().strict().meta({ id: 'ServiceUpdate' })

export const groupInputSchema = z
  .object({ name: localizedSchema(60) })
  .strict()
  .meta({ id: 'GroupInput' })

/** The whole menu's order, as the clients see it: every group, each with every one of its services. */
export const menuOrderSchema = z
  .object({ groups: z.array(z.object({ id: idSchema, serviceIds: z.array(idSchema).max(500) })).max(100) })
  .strict()
  .meta({ id: 'MenuOrder' })

export const serviceParamSchema = z.object({ slug: slugSchema, serviceId: idSchema })
export const groupParamSchema = z.object({ slug: slugSchema, groupId: idSchema })
