import { afterEach, describe, expect, it } from 'vitest'
import { markLocalWrite, resetLocalWriteLedgerForTests, wasWrittenLocally } from '../lib/localWriteLedger'
import { externalChanges } from './useVaultWatcher'

describe('localWriteLedger', () => {
  afterEach(() => resetLocalWriteLedgerForTests())

  it('remembers a write for a short window only', () => {
    markLocalWrite('/v/a.md', 1000)
    expect(wasWrittenLocally('/v/a.md', 1500)).toBe(true)
    expect(wasWrittenLocally('/v/a.md', 4000)).toBe(false)
    expect(wasWrittenLocally('/v/b.md', 1500)).toBe(false)
  })
})

describe('externalChanges', () => {
  afterEach(() => resetLocalWriteLedgerForTests())

  it('drops our own saves and pending saves, keeps everything else', () => {
    markLocalWrite('/v/ours.md', 1000)
    const payload = { vaultPath: '/v', paths: ['/v/ours.md', '/v/pending.md', '/v/phone.md'] }
    expect(externalChanges(payload, new Set(['/v/pending.md']), 1200)).toEqual(['/v/phone.md'])
  })
})
