import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { PortabilitySettingsSection } from './PortabilitySettingsSection'

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
})
