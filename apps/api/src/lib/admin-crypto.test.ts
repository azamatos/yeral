/** The Ýeral team's sign-in pieces (ADR 0026): passwords, authenticator codes, sealed secrets. */
import { describe, expect, it } from 'vitest'
import { checkPassword, hashPassword } from './password'
import { adminKeys, keyedHash, sealingKey, seal, unseal } from './sealed'
import { base32, matchTotp, otpauthUri, totpAt } from './totp'

describe('passwords (ADR 0026)', () => {
  it('a hash checks the password it was made from and nothing else', async () => {
    const stored = await hashPassword('correct horse battery', 1000)
    expect(stored).toMatch(/^pbkdf2-sha256\$1000\$[\w+/=]+\$[\w+/=]+$/)
    expect(await checkPassword('correct horse battery', stored)).toBe(true)
    expect(await checkPassword('correct horse batterY', stored)).toBe(false)
    expect(await checkPassword('correct horse battery', 'md5$1$x$y')).toBe(false)
    // salted: the same password hashes differently
    expect(await hashPassword('correct horse battery', 1000)).not.toBe(stored)
  })
})

describe('authenticator codes (RFC 6238)', () => {
  // RFC 6238 appendix B: the SHA-1 secret "12345678901234567890", 8 digits there; the last 6 are what 6-digit apps show
  const secret = new TextEncoder().encode('12345678901234567890')
  it('the RFC’s test values', async () => {
    expect(await totpAt(secret, Math.floor(59 / 30))).toBe('287082')
    expect(await totpAt(secret, Math.floor(1111111109 / 30))).toBe('081804')
    expect(await totpAt(secret, Math.floor(1234567890 / 30))).toBe('005924')
    expect(await totpAt(secret, Math.floor(20000000000 / 30))).toBe('353130')
    expect(base32(secret)).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ')
  })
  it('a code matches its step, one either side, once', async () => {
    const now = 1111111109_000
    const step = Math.floor(now / 30_000)
    expect(await matchTotp(secret, '081804', now, null)).toBe(step)
    // the clock a step ahead or behind still takes it
    expect(await matchTotp(secret, '081804', now + 30_000, null)).toBe(step)
    expect(await matchTotp(secret, '081804', now - 30_000, null)).toBe(step)
    expect(await matchTotp(secret, '081804', now + 60_000, null)).toBeNull()
    // used once: not again
    expect(await matchTotp(secret, '081804', now, step)).toBeNull()
    expect(await matchTotp(secret, '81804', now, null)).toBeNull()
    expect(otpauthUri(secret, 'Ýeral', 'azamat')).toBe(
      'otpauth://totp/%C3%9Deral:azamat?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=%C3%9Deral&algorithm=SHA1&digits=6&period=30',
    )
  })
})

describe('sealed secrets (ADR 0026)', () => {
  it('open under their key only, and not once changed', async () => {
    const key = await sealingKey(new Uint8Array(32).fill(7))
    const other = await sealingKey(new Uint8Array(32).fill(8))
    const sealed = await seal(key, new Uint8Array([1, 2, 3]))
    expect([...(await unseal(key, sealed))]).toEqual([1, 2, 3])
    await expect(unseal(other, sealed)).rejects.toThrow()
    await expect(unseal(key, sealed.slice(0, -2) + (sealed.endsWith('A') ? 'BB' : 'AA'))).rejects.toThrow()
  })
})

describe('the keys ADMIN_SECRET_KEY stands for (ADR 0026)', () => {
  it('a sealing key and a hashing key, each its own and neither the raw key', async () => {
    const raw = new Uint8Array(32).fill(3)
    const keys = await adminKeys(raw)
    const sealed = await seal(keys.sealing, new Uint8Array([4, 5, 6]))
    expect([...(await unseal(keys.sealing, sealed))]).toEqual([4, 5, 6])
    await expect(unseal(await sealingKey(raw), sealed)).rejects.toThrow()
    // the same key, the same hash; another key, another hash
    const hash = await keyedHash(keys.recovery, 'admin:abcdefgh')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(await keyedHash(keys.recovery, 'admin:abcdefgh')).toBe(hash)
    expect(await keyedHash((await adminKeys(new Uint8Array(32).fill(4))).recovery, 'admin:abcdefgh')).not.toBe(hash)
  })
})
