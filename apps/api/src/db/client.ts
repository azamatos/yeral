import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { PgTransaction } from 'drizzle-orm/pg-core'
import pg from 'pg'
import * as schema from './schema'

/** The database, with the pool or the one client it runs on (`$client`). */
export type Db = NodePgDatabase<typeof schema> & { $client: pg.Pool | pg.Client | pg.PoolClient }
/** A transaction handle; repositories accept either. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type Queryable = Db | Tx

/**
 * Independent queries: at once on a pool, one after another on one connection (a transaction, or a database made on a
 * single client), which runs one query at a time (pg 9 refuses a query sent while another runs).
 */
export async function all<const T extends readonly (() => PromiseLike<unknown>)[]>(
  db: Queryable,
  work: T,
): Promise<{ -readonly [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  if (!(db instanceof PgTransaction) && db.$client instanceof pg.Pool) return (await Promise.all(work.map((w) => w()))) as never
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
