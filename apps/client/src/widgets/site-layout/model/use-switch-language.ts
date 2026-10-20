import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { isSiteLocale } from '@/shared/i18n'

/**
 * Another language: the same page at its address in that language (`/ru/…`); signed in, it is also saved to the
 * profile, so the site and the SMS speak it next time (book C-43, Q-132). Only reachable with a market's second language.
 */
export function useSwitchLanguage() {
  const sdk = useSdk()
  const navigate = useNavigate()
  const me = useQuery(sdk.me.get())
  const save = useMutation(sdk.me.update())
  return (lang: string) => {
    if (!isSiteLocale(lang)) return
    if (me.data && me.data.lang !== lang) save.mutate({ lang })
    void navigate({ to: '.', params: (prev: Record<string, string>) => ({ ...prev, lang }), search: true, hash: true })
  }
}
