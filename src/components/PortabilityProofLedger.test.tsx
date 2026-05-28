import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  OBJECT_STORAGE_LIVE_PROOF_COMMAND,
  OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
} from '../lib/portabilityProof'
import { PortabilityProofLedger } from './PortabilityProofLedger'

describe('PortabilityProofLedger', () => {
  it('shows last live preflight evidence without provider targets', () => {
    render(
      <PortabilityProofLedger
        azureLivePreflightReport={{
          account_configured: true,
          checked_at: '2026-05-28T12:00:00Z',
          configured: true,
          container_checked: true,
          container_configured: true,
          list_prefix_checked: true,
          prefix_configured: true,
          status: 'reachable',
        }}
        s3LivePreflightReport={{
          bucket_configured: true,
          checked_at: '2026-05-28T11:00:00Z',
          configured: true,
          head_bucket_checked: true,
          list_prefix_checked: true,
          prefix_configured: false,
          region_configured: true,
          status: 'reachable',
        }}
      />,
    )

    const objectStorage = within(screen.getByTestId('portability-proof-object-storage'))
    expect(objectStorage.getByLabelText('Object storage live proof')).toBeInTheDocument()
    expect(screen.getByTestId('portability-proof-live-s3-read-only')).toHaveTextContent('S3 read-only preflight: reachable')
    expect(screen.getByTestId('portability-proof-live-s3-read-only')).toHaveTextContent('HeadBucket checked')
    expect(screen.getByTestId('portability-proof-live-azure-read-only')).toHaveTextContent('Azure read-only preflight: reachable')
    expect(screen.getByTestId('portability-proof-live-azure-read-only')).toHaveTextContent('container checked')
    expect(screen.getByTestId('portability-proof-object-storage')).not.toHaveTextContent('s3://')
    expect(screen.getByTestId('portability-proof-object-storage')).not.toHaveTextContent('azblob://')
    expect(screen.getByTestId('portability-proof-object-storage')).not.toHaveTextContent('/Users/')
  })

  it('shows the redacted provider proof runner without claiming provider-proven sync', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(<PortabilityProofLedger />)

    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    expect(row.getByText('Provider proof runner')).toBeInTheDocument()
    expect(row.getByText('available')).toBeInTheDocument()
    expect(row.getByText('live proof runner')).toBeInTheDocument()
    expect(row.getAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(1)
    expect(row.getAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(1)
    expect(row.getByText(/reports store only gate\/config set-missing state/)).toBeInTheDocument()
    expect(row.queryByText(/Needs real S3\/Azure credentials/)).not.toBeInTheDocument()
    expect(row.queryByLabelText('Provider proof runner setup checklist')).not.toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Show proof details' }))
    expect(row.getAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(2)
    expect(row.getAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(2)
    expect(row.getByText(/Needs real S3\/Azure credentials/)).toBeInTheDocument()
    expect(row.getByLabelText('Provider proof runner setup checklist')).toBeInTheDocument()
    expect(row.getByText('GRIMOIRE_S3_LIVE_WRITE_PROOF')).toBeInTheDocument()
    expect(row.getByText('GRIMOIRE_S3_BUCKET')).toBeInTheDocument()
    expect(row.getByText('GRIMOIRE_AZURE_LIVE_WRITE_PROOF')).toBeInTheDocument()
    expect(row.getByText('GRIMOIRE_AZURE_STORAGE_ACCOUNT')).toBeInTheDocument()
    expect(row.getByText('GRIMOIRE_AZURE_CONTAINER')).toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Copy dry run command' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND))
    expect(row.getByText('Copied')).toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Copy live proof command' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_COMMAND))
    expect(row.queryByText(/provider-proven sync/i)).not.toBeInTheDocument()
    expect(row.queryByText(/s3:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/azblob:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/\/Users\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/secret/i)).not.toBeInTheDocument()
  })

  it('loads a pasted redacted provider proof report into the runner row', () => {
    render(<PortabilityProofLedger />)

    fireEvent.click(screen.getByRole('button', { name: 'Paste redacted proof report' }))
    fireEvent.change(screen.getByLabelText('Redacted proof report JSON'), {
      target: {
        value: JSON.stringify({
          schema: 'grimoire-object-storage-live-proof-v1',
          generated_at: '2026-05-28T12:30:00Z',
          finished_at: '2026-05-28T12:35:00Z',
          provider_filter: 'all',
          summary: { status: 'failed', message: 'raw /Users/sriinnu/.aws s3://secret-bucket' },
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
        }),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }))

    expect(screen.getByTestId('portability-proof-live-provider-report-summary')).toHaveTextContent('Latest proof report: failed')
    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent('S3 provider proof: passed')
    expect(screen.getByTestId('portability-proof-live-azure-provider-proof')).toHaveTextContent('Azure provider proof: missing config')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('s3://')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('secret-bucket')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('provider-proven sync')
  })
})
