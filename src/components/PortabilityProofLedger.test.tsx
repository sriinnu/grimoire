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

    expect(screen.getByText('Portability Status')).toBeInTheDocument()
    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    expect(row.getByText('Provider proof runner')).toBeInTheDocument()
    expect(row.getByText('opt-in')).toBeInTheDocument()
    expect(row.getByText('manual live proof')).toBeInTheDocument()
    expect(row.queryAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(0)
    expect(row.queryAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(0)
    expect(row.getByText(/Load a redacted live proof report/)).toBeInTheDocument()
    expect(row.queryByText(/Needs real S3\/Azure credentials/)).not.toBeInTheDocument()
    expect(row.queryByLabelText('Provider proof runner setup checklist')).not.toBeInTheDocument()
    fireEvent.click(row.getByRole('button', { name: 'Developer proof details' }))
    expect(row.getAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(1)
    expect(row.getAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(1)
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

  it('shows reviewed capsule preview proof without leaking local capsule paths', () => {
    render(
      <PortabilityProofLedger
        capsuleExportPreview={{
          format: 'json',
          result: {
            assets_exportable: 2,
            bytes_exportable: 4096,
            files_exportable: 6,
            format: 'json',
            locality_proof: {
              absolute_source_paths_redacted: true,
              local_only_files_withheld: 3,
              markdown_source_of_truth: true,
            },
            manifest_rows: [{ bytes: 100, kind: 'markdown', path: '/Users/sriinnu/journal.md' }],
            notes_exportable: 4,
            skipped_files: 3,
          },
        }}
        capsuleImportPreview={{
          sourceId: 'json-capsule-preview',
          result: {
            assets_to_copy: 2,
            failed_files: 0,
            manifest_rows: [
              { detail: 'withheld /Users/sriinnu/Dreams.md', kind: 'withheld', source_path: '/Users/sriinnu/Dreams.md' },
            ],
            notes_to_copy: 4,
            planned_import_root: '/Users/sriinnu/Grimoire/imports/json',
            skipped_files: 3,
            source_path: '/Users/sriinnu/capsule.json',
            writes_local_only_report: true,
          },
        }}
      />,
    )

    expect(screen.getByTestId('portability-proof-live-json-capsule-export-preview')).toHaveTextContent(
      'JSON capsule export preview: reviewed',
    )
    expect(screen.getByTestId('portability-proof-live-json-capsule-import-preview')).toHaveTextContent(
      'JSON capsule import preview: reviewed',
    )
    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveAttribute('data-loop-status', 'reviewed')
    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveTextContent('preview-paired')
    expect(screen.getByTestId('portability-capsule-loop-step-locality-proof')).toHaveAttribute('data-step-status', 'done')
    expect(screen.getByTestId('portability-proof-imports')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('portability-proof-exports')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('portability-proof-ledger')).not.toHaveTextContent('Dreams.md')
    expect(screen.getByTestId('portability-proof-ledger')).not.toHaveTextContent('journal.md')
  })

  it('shows missing capsule loop proof before matching previews exist', () => {
    render(<PortabilityProofLedger />)

    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveAttribute('data-loop-status', 'missing')
    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveTextContent('not paired')
    expect(screen.getByTestId('portability-capsule-loop-step-export-preview')).toHaveAttribute('data-step-status', 'missing')
    expect(screen.getByTestId('portability-capsule-loop-step-import-preview')).toHaveAttribute('data-step-status', 'missing')
  })
})
