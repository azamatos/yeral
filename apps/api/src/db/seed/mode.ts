/**
 * What `db:seed` / `db:setup` may write, failing closed: the demo wipes the database, so it needs `YERAL_ENV` set
 * explicitly to an environment that runs the demo; production gets the category catalogue. The site config's default
 * (`local`) never counts here, so a server without `YERAL_ENV` refuses instead of wiping.
 */
import { SITE_ENVS } from '@yeral/lib/site'

/**
 * Where seeding may write. The demo wipes the database, so it goes only into a local or Docker database, whatever the
 * flags: with no staging (ADR 0020) the only remote database is production. The catalogue may go to a remote database
 * with `--allow-remote`.
 */
export function assertSeedTarget(t: { demo: boolean; local: boolean; allowRemote: boolean; host: string }): void {
  if (t.local) return
  if (t.demo)
    throw new Error(`Refusing to seed the demo into ${t.host}: it wipes the database, so it runs on local and Docker databases only`)
  if (!t.allowRemote) throw new Error(`Refusing to seed ${t.host}: pass --allow-remote for a remote database`)
}

export function seedMode(yeralEnv: string | undefined): 'demo' | 'catalogue' {
  if (yeralEnv === 'production') return 'catalogue'
  if ((SITE_ENVS as readonly string[]).includes(yeralEnv ?? '')) return 'demo'
  throw new Error(
    'Refusing to seed without YERAL_ENV: local or docker seed the demo (wipes the database), production the category catalogue',
  )
}
