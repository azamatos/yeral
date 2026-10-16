/**
 * What `db:seed` / `db:setup` may write, failing closed: the demo wipes the database, so it needs `YERAL_ENV` set
 * explicitly to an environment that runs the demo; production gets the category catalogue. The site config's default
 * (`local`) never counts here, so a server without `YERAL_ENV` refuses instead of wiping.
 */
import { SITE_ENVS } from '@yeral/lib/site'

export function seedMode(yeralEnv: string | undefined): 'demo' | 'catalogue' {
  if (yeralEnv === 'production') return 'catalogue'
  if ((SITE_ENVS as readonly string[]).includes(yeralEnv ?? '')) return 'demo'
  throw new Error(
    'Refusing to seed without YERAL_ENV: local or docker seed the demo (wipes the database), production the category catalogue',
  )
}
