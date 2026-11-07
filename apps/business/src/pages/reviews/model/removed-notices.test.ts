import { describe, expect, it } from 'vitest'
import { closedIds, keepClosed, removedNoticesKey } from './removed-notices'

describe('the closed «Ýeral removed a review you reported» notices', () => {
  it('reads what this browser kept, and nothing from what it can’t read', () => {
    expect(closedIds(null)).toEqual([])
    expect(closedIds('["a","b"]')).toEqual(['a', 'b'])
    expect(closedIds('["a",1,null]')).toEqual(['a'])
    expect(closedIds('{"a":1}')).toEqual([])
    expect(closedIds('not json')).toEqual([])
  })

  it('keeps the closed ids the api still sends, once each, and forgets the rest', () => {
    const removed = [
      { id: 'a', author: 'Merdan K.', at: 1 },
      { id: 'b', author: 'Selbi A.', at: 2 },
    ]
    expect(keepClosed([], removed, 'a')).toEqual(['a'])
    expect(keepClosed(['a'], removed, 'b')).toEqual(['a', 'b'])
    expect(keepClosed(['a', 'gone'], removed, 'a')).toEqual(['a'])
  })

  it('keeps one list per workspace', () => {
    expect(removedNoticesKey('glow-studio')).not.toBe(removedNoticesKey('bag-kafe'))
  })
})
