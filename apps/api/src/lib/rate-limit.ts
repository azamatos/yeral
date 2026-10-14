/** Fixed-window counters in Postgres (`rate_limits`), so limits hold across Worker isolates and Node processes. */
import { sql } from 'drizzle-orm'
import type { Queryable } from '../db/client'

export async function hit(
  db: Queryable,
  key: string,
  limit: number,
  windowSec: number,
  now: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const at = new Date(now)
  const windowStartMin = new Date(now - windowSec * 1000)
  const { rows } = await db.execute<{ count: number; window_start: string }>(sql`
    insert into rate_limits (key, window_start, count) values (${key}, ${at}, 1)
    on conflict (key) do update set
      count = case when rate_limits.window_start <= ${windowStartMin} then 1 else rate_limits.count + 1 end,
      window_start = case when rate_limits.window_start <= ${windowStartMin} then ${at} else rate_limits.window_start end
    returning count, window_start`)
  const row = rows[0]
  if (!row) return { ok: true, retryAfterSec: 0 }
  const started = new Date(row.window_start).getTime()
  return { ok: row.count <= limit, retryAfterSec: Math.max(1, Math.ceil((started + windowSec * 1000 - now) / 1000)) }
}

/** The caller's IP: Cloudflare's header on Workers, nginx's X-Forwarded-For on the own server. */
export function clientIp(header: (name: string) => string | undefined): string {
  return header('cf-connecting-ip') ?? header('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
}
