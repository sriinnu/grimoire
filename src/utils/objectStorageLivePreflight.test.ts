import { describe, expect, it } from 'vitest'
import {
  azureLivePreflightStatusLabel,
  formatAzureLivePreflightToast,
  runAzureLivePreflight,
} from './objectStorageLivePreflight'

describe('objectStorageLivePreflight', () => {
  it('calls the mock Azure live preflight command in browser mode without local paths', async () => {
    await expect(runAzureLivePreflight()).resolves.toMatchObject({
      provider_id: 'azure-blob',
      proof_level: 'live-read-only-preflight',
      status: 'missing_config',
      account_configured: false,
      container_checked: false,
    })
  })

  it('passes optional Azure preflight scope through as redacted configured state', async () => {
    await expect(runAzureLivePreflight({
      account: ' sriinnuacct ',
      container: ' grimoire ',
      prefix: ' notes/ ',
    })).resolves.toMatchObject({
      status: 'reachable',
      account_configured: true,
      container_configured: true,
      prefix_configured: true,
      container_checked: true,
      list_prefix_checked: true,
    })
  })

  it('formats Azure live preflight status as a redacted proof summary', () => {
    expect(formatAzureLivePreflightToast({
      provider_id: 'azure-blob',
      proof_level: 'live-read-only-preflight',
      configured: true,
      status: 'auth_denied',
      account_configured: true,
      container_configured: true,
      prefix_configured: false,
      container_checked: true,
      list_prefix_checked: false,
      message: 'Azure denied the read-only Blob preflight for the local login.',
      checked_at: '2026-05-25T00:00:00Z',
    })).toBe('Azure live read-only preflight: access denied')
  })

  it('labels missing CLI distinctly from missing login', () => {
    expect(azureLivePreflightStatusLabel('missing_cli')).toBe('Azure CLI missing')
    expect(azureLivePreflightStatusLabel('missing_credentials')).toBe('login missing')
  })
})
