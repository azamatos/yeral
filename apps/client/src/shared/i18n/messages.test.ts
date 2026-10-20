import { DEFAULT_LOCALE, MARKET_LOCALES, messages as shared } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import en from '../../../messages/en.json'
import { CLIENT_MESSAGES, isSiteLocale, messagesFor, SITE_LOCALES, siteLocale, translatorFor } from './messages'

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]))

describe('client messages', () => {
  it.each(MARKET_LOCALES)('%s, a language the market offers, has every key of the English source', (locale) => {
    const own = CLIENT_MESSAGES[locale]
    expect(own, `apps/client/messages/${locale}.json`).toBeDefined()
    expect(keys(own ?? {}).sort()).toEqual(keys(en).sort())
  })

  it("never redefines a shared namespace (common, status, errors, fmt…): the site's would hide it", () => {
    const sharedNamespaces = Object.keys(shared.en)
    expect(Object.keys(en).filter((ns) => sharedNamespaces.includes(ns))).toEqual([])
  })

  it('merges the shared namespaces with the site’s', () => {
    const merged = messagesFor('en')
    expect(merged.common.brand).toBe(shared.en.common.brand)
    expect(merged.site.logIn).toBe(en.site.logIn)
  })

  it('translates outside React, for page titles', () => {
    const t = translatorFor('en')
    expect(t('notFound.title')).toBe(en.notFound.title)
    expect(t('site.home', { brand: t('common.brand') })).toBe(`${shared.en.common.brand} home`)
  })
})

describe('site locales', () => {
  it("are the market's languages, the main one among them", () => {
    expect(SITE_LOCALES).toEqual(MARKET_LOCALES)
    expect(SITE_LOCALES).toContain(DEFAULT_LOCALE)
  })

  it('take an address segment only when it is one of them', () => {
    expect(isSiteLocale(DEFAULT_LOCALE)).toBe(true)
    expect(isSiteLocale('de')).toBe(false)
    expect(isSiteLocale(undefined)).toBe(false)
    expect(siteLocale('de')).toBe(DEFAULT_LOCALE)
  })
})
