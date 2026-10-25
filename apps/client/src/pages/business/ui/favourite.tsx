import { useMutation, useQuery } from '@tanstack/react-query'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { toast } from '@yeral/ui/toast'
import { Heart } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'

// the login comes over the page only when someone needs it: its steps stay out of the page's first download
const LoginModal = lazy(() => import('@/features/log-in').then((m) => ({ default: m.LoginModal })))

/**
 * The heart (Venue `favCls`, book C-07): pressed while the place is in the person's favourites; signed out, it opens
 * the login first and saves the place once the person is in (States 10). `wide` is the paused card's full-width
 * ghost «Add to favourites» (States 05); otherwise a 44 square with the words for screen readers.
 */
export function FavouriteButton({ slug, wide = false }: { slug: string; wide?: boolean }) {
  const t = useTranslations('business.favourite')
  const lang = useLocale()
  const sdk = useSdk()
  const me = useQuery(sdk.me.get())
  const favourites = useQuery({ ...sdk.me.favorites(lang), enabled: Boolean(me.data) })
  const on = Boolean(me.data && favourites.data?.items.some((b) => b.slug === slug))
  const save = useMutation({ ...sdk.me.setFavorite(), onError: () => toast(t('failed')) })
  const [login, setLogin] = useState(false)
  const label = on ? t('saved') : t('add')
  const press = () => (me.data ? save.mutate({ slug, on: !on }) : setLogin(true))
  return (
    <>
      <Button
        variant={wide ? 'ghost' : on ? 'tint' : 'secondary'}
        iconOnly={!wide}
        aria-pressed={on}
        aria-label={wide ? undefined : label}
        className={wide ? '-mt-1 w-full' : undefined}
        // a press while one saves waits for it (never disabled under the person's focus)
        onClick={() => !save.isPending && press()}
      >
        <Heart aria-hidden fill={on ? 'currentColor' : 'none'} />
        {wide && label}
      </Button>
      {login && (
        <Suspense fallback={null}>
          <LoginModal
            open={login}
            onOpenChange={setLogin}
            onSignedIn={() => {
              setLogin(false)
              save.mutate({ slug, on: true })
            }}
          />
        </Suspense>
      )}
    </>
  )
}
