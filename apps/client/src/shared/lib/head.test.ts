import { DEFAULT_LOCALE, messages } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { site } from '@/shared/config'
import { SITE_LOCALES } from '@/shared/i18n'
import { pageHead } from './head'

const brand = messages[DEFAULT_LOCALE].common.brand

describe('pageHead', () => {
  it('names the page, then the brand; Home is the brand alone', () => {
    expect(pageHead(DEFAULT_LOCALE, { path: '' }).meta[0]).toEqual({ title: brand })
    const head = pageHead(DEFAULT_LOCALE, { path: '/x', title: (t) => t('notFound.title') })
    expect(head.meta[0]).toEqual({ title: `Page not found · ${brand}` })
  })

  it('points to itself and to the same page in each of the site’s languages', () => {
    const { links } = pageHead(DEFAULT_LOCALE, { path: '/account/profile' })
    const at = (l: string) => `${site.urls.client}/${l}/account/profile`
    expect(links).toContainEqual({ rel: 'canonical', href: at(DEFAULT_LOCALE) })
    for (const l of SITE_LOCALES) expect(links).toContainEqual({ rel: 'alternate', hrefLang: l, href: at(l) })
    expect(links).toContainEqual({ rel: 'alternate', hrefLang: 'x-default', href: at(DEFAULT_LOCALE) })
  })

  it('describes the page when it says what it is', () => {
    const head = pageHead(DEFAULT_LOCALE, { path: '', description: (t) => t('site.tagline') })
    expect(head.meta).toContainEqual({ name: 'description', content: 'Online booking for any service.' })
    expect(head.meta).toContainEqual({ property: 'og:description', content: 'Online booking for any service.' })
  })

  it('keeps a page behind a sign-in out of search, with no canonical to index', () => {
    const head = pageHead(DEFAULT_LOCALE, { path: '/login', noindex: true })
    expect(head.meta).toContainEqual({ name: 'robots', content: 'noindex' })
    expect(head.links).toEqual([])
  })
})
