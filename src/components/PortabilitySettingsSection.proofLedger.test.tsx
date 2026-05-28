import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import {
  runDesktopStorageHealthCheck,
  type DesktopStorageHealthReport,
} from '../utils/desktopStorageHealth'
import { PortabilitySettingsSection } from './PortabilitySettingsSection'

vi.mock('../utils/desktopStorageHealth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/desktopStorageHealth')>()
  return {
    ...actual,
    runDesktopStorageHealthCheck: vi.fn(),
  }
})

const readyICloudDesktopProof: DesktopStorageHealthReport = {
  checked_at: '2026-05-28T13:00:00Z',
  configured: true,
  credentials_stored: false,
  local_path_checked: true,
  message: 'iCloud Drive local folder is readable.',
  provider_id: 'icloud-drive',
  provider_root_detected: true,
  proof_level: 'desktop-folder-read-check',
  readable: true,
  risk_notes: ['No cloud credentials are stored by Grimoire.'],
  status: 'ready',
  vault_directory_checked: true,
}

describe('PortabilitySettingsSection proof ledger', () => {
  it('passes latest S3 and Azure read-only preflights into the proof ledger', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        azureLivePreflightReport={{
          account_configured: true,
          checked_at: '2026-05-28T12:00:00Z',
          configured: true,
          container_checked: true,
          container_configured: true,
          list_prefix_checked: true,
          prefix_configured: false,
          provider_id: 'azure-blob',
          proof_level: 'live-read-only-preflight',
          status: 'missing_credentials',
          message: 'redacted',
        }}
        s3LivePreflightReport={{
          bucket_configured: true,
          checked_at: '2026-05-28T11:00:00Z',
          configured: true,
          head_bucket_checked: true,
          list_prefix_checked: true,
          prefix_configured: false,
          provider_id: 's3',
          proof_level: 'live-read-only-preflight',
          region_configured: true,
          status: 'reachable',
          message: 'redacted',
        }}
      />,
    )

    expect(screen.getByTestId('portability-proof-live-s3-read-only')).toHaveTextContent('S3 read-only preflight: reachable')
    expect(screen.getByTestId('portability-proof-live-azure-read-only')).toHaveTextContent(
      'Azure read-only preflight: missing credentials',
    )
  })

  it('passes sanitized live provider proof reports into the proof ledger', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        objectStorageLiveProofReport={{
          schema: 'grimoire-object-storage-live-proof-v1',
          generated_at: '2026-05-28T12:30:00Z',
          finished_at: '2026-05-28T12:35:00Z',
          provider_filter: 'all',
          summary: { status: 'failed', message: 'Redacted provider proof report loaded.' },
          providers: [
            {
              id: 's3',
              enabled: true,
              gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
              required: { GRIMOIRE_S3_BUCKET: 'set' },
              optional: { GRIMOIRE_S3_REGION: 'set', GRIMOIRE_S3_PREFIX: 'missing' },
              status: 'passed',
            },
            {
              id: 'azure',
              enabled: true,
              gate: { name: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF', state: 'set' },
              required: { GRIMOIRE_AZURE_STORAGE_ACCOUNT: 'set', GRIMOIRE_AZURE_CONTAINER: 'missing' },
              optional: { GRIMOIRE_AZURE_PREFIX: 'missing' },
              status: 'missing_config',
            },
          ],
        }}
      />,
    )

    expect(screen.getByTestId('portability-proof-live-provider-report-summary')).toHaveTextContent(
      'Latest proof report: failed',
    )
    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent(
      'S3 provider proof: passed',
    )
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('provider-proven sync')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('/Users/')
  })

  it('lifts desktop iCloud and Google Drive folder checks into the proof ledger', async () => {
    vi.mocked(runDesktopStorageHealthCheck).mockResolvedValueOnce(readyICloudDesktopProof)

    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        vaultPath="/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire"
      />,
    )

    fireEvent.click(screen.getByTestId('settings-check-icloud-drive'))

    const proof = await screen.findByTestId('portability-proof-live-icloud-drive-folder')
    await waitFor(() => expect(runDesktopStorageHealthCheck).toHaveBeenCalledWith(
      '/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire',
      'icloud-drive',
    ))
    expect(proof).toHaveTextContent('iCloud Drive folder proof: ready')
    expect(proof).toHaveTextContent('credentials not stored')
    expect(proof).toHaveTextContent('checked 2026-05-28T13:00:00Z')
    expect(screen.getByTestId('portability-proof-desktop-sync')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('portability-proof-desktop-sync')).not.toHaveTextContent('token')
    expect(screen.getByTestId('portability-proof-desktop-sync')).not.toHaveTextContent('secret')
  })
})
