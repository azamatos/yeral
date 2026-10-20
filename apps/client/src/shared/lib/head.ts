/**
 * A page's `<head>` (systemPatterns "Rendering", ADR 0002, ADR 0022): its title («Page · Ýeral», the brand alone on
 * Home), description, canonical address and the same page in each of the site's languages (hreflang), with the
 * market's main language as `x-default`. Routes call it from `head()`, before any component renders.
 */
import { DEFAULT_LOCALE, type Locale } from '@yeral/i18n'
import { site } from '@/shared/config'
import { SITE_LOCALES, translatorFor } from '@/shared/i18n'

type Translator = ReturnType<typeof translatorFor>

export interface PageHeadOptions {
  /** The address after the language: '' for Home, '/account/profile'. */
  path: string
  title?: (t: Translator) => string
  description?: (t: Translator) => string
  /** Pages behind a sign-in, and the login: never in search results. */
  noindex?: boolean
}

export function pageHead(locale: Locale, { path, title, description, noindex = false }: PageHeadOptions) {
  const t = translatorFor(locale)
  const brand = t('common.brand')
  const href = (l: Locale) => `${site.urls.client}/${l}${path}`
  const fullTitle = title ? `${title(t)} · ${brand}` : brand
  const text = description?.(t)
  return {
    meta: [
      { title: fullTitle },
      ...(text ? [{ name: 'description', content: text }] : []),
      ...(noindex ? [{ name: 'robots', content: 'noindex' }] : []),
      { property: 'og:site_name', content: brand },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: fullTitle },
      ...(text ? [{ property: 'og:description', content: text }] : []),
      { property: 'og:url', content: href(locale) },
      { property: 'og:locale', content: locale },
    ],
    links: noindex
      ? []
      : [
          { rel: 'canonical', href: href(locale) },
          ...SITE_LOCALES.map((l) => ({ rel: 'alternate', hrefLang: l, href: href(l) })),
          { rel: 'alternate', hrefLang: 'x-default', href: href(DEFAULT_LOCALE) },
        ],
  }
}
