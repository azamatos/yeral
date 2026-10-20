import { createFileRoute, redirect } from '@tanstack/react-router'
import { acceptedLanguages, pickLocale } from '@/shared/i18n'
import { visitorLanguages } from '../entrypoint/visitor-languages'

// `/` opens the site in a language (book Q-132): the signed-in person's, else the browser's when the site has it, else
// the market's main one. Every other address carries its language (ADR 0022).
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get()).catch(() => null)
    const lang = pickLocale({ saved: me?.lang, accepted: acceptedLanguages(visitorLanguages()) })
    redirect({ to: '/$lang', params: { lang }, replace: true, throw: true })
  },
})
