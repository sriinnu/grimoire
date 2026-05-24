import { describe, expect, it } from 'vitest'
import { cancelVaultRebuild, reloadVaultWithProgress } from './vaultRebuild'

describe('vaultRebuild', () => {
  it('reports browser-fallback reload progress', async () => {
    const events: string[] = []

    const entries = await reloadVaultWithProgress('/vault', 'rebuild-test', (event) => {
      events.push(event.event)
    })

    expect(entries.length).toBeGreaterThan(0)
    expect(events[0]).toBe('Started')
    expect(events).toContain('Progress')
    expect(events.at(-1)).toBe('Finished')
  })

  it('cancels browser-fallback rebuilds through the shared portability token', async () => {
    await expect(cancelVaultRebuild('rebuild-test')).resolves.toBe(true)
  })
})
