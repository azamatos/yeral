/** Fixed-window counters in Postgres (`rate_limits`), so limits hold across processes and restarts. */
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

/** The header our edge writes with the caller's address (`TRUSTED_IP_HEADER`); callers can send any header themselves. */
export type TrustedIpHeader = 'cf-connecting-ip' | 'x-forwarded-for'

/**
 * The caller's IP for rate limits, read only from the header our edge sets: on the own server the last
 * `X-Forwarded-For` entry, the one Caddy wrote; Cloudflare's `CF-Connecting-IP` if its proxy ever sits in front.
 * Nothing trusted → one shared bucket.
 */
export function clientIp(header: (name: string) => string | undefined, trusted?: TrustedIpHeader): string {
  if (trusted === 'cf-connecting-ip') return header('cf-connecting-ip')?.trim() || 'unknown'
  if (trusted === 'x-forwarded-for') return header('x-forwarded-for')?.split(',').at(-1)?.trim() || 'unknown'
  return 'unknown'
}
