import { DEFAULT_LOCALE, MARKET_LOCALES, messages as shared } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import en from '../../../messages/en.json'
import { appLocale, BUSINESS_MESSAGES, messagesFor } from './messages'

const keys = (o: object, prefix = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' && v !== null ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`]))

describe('business messages', () => {
  it.each(MARKET_LOCALES)('%s, a language the market offers, has every key of the English source', (locale) => {
    const own = BUSINESS_MESSAGES[locale]
    expect(own, `apps/business/messages/${locale}.json`).toBeDefined()
    expect(keys(own ?? {}).sort()).toEqual(keys(en).sort())
  })

  it("never redefines a shared namespace (common, status, errors, fmt…): the app's would hide it", () => {
    const sharedNamespaces = Object.keys(shared.en)
    expect(Object.keys(en).filter((ns) => sharedNamespaces.includes(ns))).toEqual([])
  })

  it('merges the shared namespaces with the app’s', () => {
    const merged = messagesFor('en')
    expect(merged.common.brand).toBe(shared.en.common.brand)
    expect(merged.app.name).toBe(en.app.name)
  })
})

describe('appLocale', () => {
  it("speaks the person's language when the market offers it", () => {
    for (const locale of MARKET_LOCALES) expect(appLocale(locale)).toBe(locale)
  })

  it("falls back to the market's main language for anything else", () => {
    expect(appLocale(undefined)).toBe(DEFAULT_LOCALE)
    expect(appLocale('de')).toBe(DEFAULT_LOCALE)
  })
})
