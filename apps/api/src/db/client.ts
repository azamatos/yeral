import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { PgTransaction } from 'drizzle-orm/pg-core'
import pg from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>
/** A transaction handle; repositories accept either. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type Queryable = Db | Tx

/**
 * Independent queries: at once on the pool, one after another in a transaction, whose one connection runs one query at
 * a time (pg 9 refuses a query sent while another runs).
 */
export async function all<const T extends readonly (() => PromiseLike<unknown>)[]>(
  db: Queryable,
  work: T,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  if (!(db instanceof PgTransaction)) return (await Promise.all(work.map((w) => w()))) as never
  const out: unknown[] = []
  for (const w of work) out.push(await w())
  return out as never
}

/** One pool per Node process: the api and its jobs tick share it. */
export function createPool(connectionString: string, max = 10): pg.Pool {
  return new pg.Pool({ connectionString, max })
}

export function createDb(client: pg.Pool | pg.Client | pg.PoolClient): Db {
  return drizzle({ client, schema, casing: 'snake_case' })
}

export { schema }
