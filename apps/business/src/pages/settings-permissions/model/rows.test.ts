import { LEVELS, PERMISSION_TABLE } from '@yeral/domain/permissions'
import { describe, expect, it } from 'vitest'
import { PERMISSION_ROWS } from './rows'

describe('the permissions table (design §28.1)', () => {
  it('has the 13 rows of the board', () => {
    expect(PERMISSION_ROWS).toHaveLength(13)
    expect(new Set(PERMISSION_ROWS.map((r) => r.id)).size).toBe(13)
  })

  it('says what the api enforces: no where the level has none, yes where it has all, words where it has some', () => {
    for (const row of PERMISSION_ROWS) {
      if (!row.permission) continue
      for (const level of LEVELS) {
        const scope = PERMISSION_TABLE[level][row.permission]
        const cell = row[level]
        if (scope === 'none') expect(cell, `${row.id} · ${level}`).toBe('no')
        else if (scope === 'all' || scope === 'manage') expect(cell, `${row.id} · ${level}`).toBe('yes')
        else expect(['yes', 'no'], `${row.id} · ${level}`).not.toContain(cell)
      }
    }
  })
})
