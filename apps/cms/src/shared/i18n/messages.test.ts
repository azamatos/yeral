import { messages as shared } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import en from '../../../messages/en.json'
import { messages } from './messages'

describe('cms messages', () => {
  it("never redefines a shared namespace (common, status, errors, fmt…): the app's would hide it", () => {
    const sharedNamespaces = Object.keys(shared.en)
    expect(Object.keys(en).filter((ns) => sharedNamespaces.includes(ns))).toEqual([])
  })

  it('merges the shared namespaces with the app’s', () => {
    const merged = messages()
    expect(merged.common.brand).toBe(shared.en.common.brand)
    expect(merged.app.name).toBe(en.app.name)
  })
})
