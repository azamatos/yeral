/** Column helpers shared by the schema files. */
import { customType, timestamp } from 'drizzle-orm/pg-core'

/** `timestamptz` as a JS Date. */
export const ts = (name?: string) =>
  name ? timestamp(name, { withTimezone: true, mode: 'date' }) : timestamp({ withTimezone: true, mode: 'date' })

export const createdAt = () => ts().notNull().defaultNow()

/** Postgres `xid8`: the id of the transaction that wrote a row (events, for a cursor that never skips). */
export const xid8 = customType<{ data: string; driverData: string }>({
  dataType: () => 'xid8',
})

/** Postgres `int4range`, used only by exclusion constraints (minutes of one business day, end excluded). */
export const int4range = customType<{ data: string; driverData: string }>({
  dataType: () => 'int4range',
})
