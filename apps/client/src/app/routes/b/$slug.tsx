import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { BOOKING_CODE_PREFIX } from '@yeral/domain/id'
import { acceptedLanguages, pickLocale } from '@/shared/i18n'
import { knowVisitor } from '../../entrypoint/site-api'
import { visitorLanguages } from '../../entrypoint/visitor-languages'

// `yeral.app/b/{slug}`, the page link and QR code a business shares (Link and QR), opens its page in the visitor's
// language as `/` picks it (book Q-132), the rest of the address along; the language differs per visitor, so the move
// isn't permanent. `/b/YR-48213`, a booking's SMS link (book chapter 5, C-38), comes with the first launch's SMS (P4
// slice 7): a 404 until then.
export const Route = createFileRoute('/b/$slug')({
  beforeLoad: async ({ context, params, location }) => {
    if (params.slug.toUpperCase().startsWith(BOOKING_CODE_PREFIX)) notFound({ throw: true })
    await knowVisitor(context)
    const me = context.queryClient.getQueryData(context.sdk.me.get().queryKey)
    const lang = pickLocale({ saved: me?.lang, accepted: acceptedLanguages(visitorLanguages()) })
    // a typed link in capitals still finds its page (addresses are lower case)
    redirect({ href: `/${lang}/b/${encodeURIComponent(params.slug.toLowerCase())}${location.searchStr}`, replace: true, throw: true })
  },
})
