import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>
/** A transaction handle; repositories accept either. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type Queryable = Db | Tx

/** A pool for long-running Node processes; on Workers a client per request through Hyperdrive (M2g). */
export function createPool(connectionString: string, max = 10): pg.Pool {
  return new pg.Pool({ connectionString, max })
}

export function createDb(client: pg.Pool | pg.Client | pg.PoolClient): Db {
  return drizzle({ client, schema, casing: 'snake_case' })
}

export { schema }
