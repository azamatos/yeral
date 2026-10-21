import { createFileRoute, redirect } from '@tanstack/react-router'
import { acceptedLanguages, pickLocale } from '@/shared/i18n'
import { knowVisitor } from '../entrypoint/site-api'
import { visitorLanguages } from '../entrypoint/visitor-languages'

// `/` opens the site in a language (book Q-132): the signed-in person's, else the browser's when the site has it, else
// the market's main one; the rest of the address (`?utm_source=…`) comes along. Every other address carries its
// language (ADR 0022).
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context, location }) => {
    await knowVisitor(context)
    const me = context.queryClient.getQueryData(context.sdk.me.get().queryKey)
    const lang = pickLocale({ saved: me?.lang, accepted: acceptedLanguages(visitorLanguages()) })
    redirect({ href: `/${lang}${location.searchStr}${location.hash ? `#${location.hash}` : ''}`, replace: true, throw: true })
  },
})
