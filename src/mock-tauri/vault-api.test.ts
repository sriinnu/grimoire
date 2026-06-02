import { afterEach, describe, expect, it, vi } from 'vitest'

const originalFetch = globalThis.fetch

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('tryVaultApi', () => {
  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    globalThis.fetch = originalFetch
  })

  it('retries vault API discovery after an unavailable response', async () => {
    let vaultApiOnline = false
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === '/api/vault/ping') {
        return jsonResponse({ ok: vaultApiOnline }, vaultApiOnline ? 200 : 503)
      }
      if (url === '/api/vault/list?path=%2Ffixture') {
        return jsonResponse([{ title: 'Alpha Project' }])
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    globalThis.fetch = fetchMock as typeof fetch

    const { tryVaultApi } = await import('./vault-api')

    await expect(tryVaultApi('list_vault', { path: '/fixture' })).resolves.toBeUndefined()

    vaultApiOnline = true

    await expect(tryVaultApi('list_vault', { path: '/fixture' })).resolves.toEqual([{ title: 'Alpha Project' }])
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/vault/ping')).toHaveLength(2)
  })

  it('unwraps note content responses from the vault API', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === '/api/vault/ping') {
        return jsonResponse({ ok: true })
      }
      if (url === '/api/vault/content?path=%2Ffixture%2Falpha.md') {
        return jsonResponse({ content: '# Alpha Project' })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    globalThis.fetch = fetchMock as typeof fetch

    const { tryVaultApi } = await import('./vault-api')

    await expect(tryVaultApi('get_note_content', { path: '/fixture/alpha.md' })).resolves.toBe('# Alpha Project')
    expect(fetchMock.mock.calls.filter(([url]) => String(url) === '/api/vault/ping')).toHaveLength(1)
  })

  it('uses explicit search vault scope instead of the last loaded vault', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === '/api/vault/ping') {
        return jsonResponse({ ok: true })
      }
      if (url === '/api/vault/list?path=%2Factive') {
        return jsonResponse([])
      }
      if (url === '/api/vault/search?vault_path=%2Fwork&query=journal&mode=keyword') {
        return jsonResponse({ results: [{ title: 'Work Journal' }], elapsed_ms: 1 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    globalThis.fetch = fetchMock as typeof fetch

    const { tryVaultApi } = await import('./vault-api')

    await expect(tryVaultApi('list_vault', { path: '/active' })).resolves.toEqual([])
    await expect(tryVaultApi('search_vault', {
      mode: 'keyword',
      query: 'journal',
      vaultPath: '/work',
    })).resolves.toEqual({ results: [{ title: 'Work Journal' }], elapsed_ms: 1 })
  })

  it('skips the vault API for mock-only search paths', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const url = String(input)
      if (url === '/api/vault/ping') {
        return jsonResponse({ ok: true })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })
    globalThis.fetch = fetchMock as typeof fetch

    const { tryVaultApi } = await import('./vault-api')

    await expect(tryVaultApi('search_vault', {
      mode: 'keyword',
      query: 'journal',
      vaultPath: '/Users/mock/demo-vault-v2',
    })).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
