import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import { createTranslator } from '../lib/i18n'
import {
  OBJECT_STORAGE_LIVE_PROOF_COMMAND,
  OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
} from '../lib/portabilityProof'
import { PortabilityProofLedger } from './PortabilityProofLedger'

const t = createTranslator('en')

function createStorageMock(): Storage {
  let store: Record<string, string> = {}
  return {
    get length() { return Object.keys(store).length },
    clear: vi.fn(() => { store = {} }),
    getItem: vi.fn((key: string) => store[key] ?? null),
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  }
}

describe('PortabilityProofLedger', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    })
    window.localStorage.clear()
  })

  it('shows last live preflight evidence without provider targets', () => {
    render(
      <PortabilityProofLedger
        t={t}
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

    render(<PortabilityProofLedger t={t} />)

    expect(screen.getByText('Portability Status')).toBeInTheDocument()
    expect(screen.getByTestId('portability-proof-history')).toHaveTextContent('no reports yet')
    const desktopSync = within(screen.getByTestId('portability-proof-desktop-sync'))
    expect(desktopSync.getByText('folder proof only')).toBeInTheDocument()
    expect(desktopSync.getByText(/provider sync not proven/)).toBeInTheDocument()
    expect(desktopSync.getByText(/proves local folder readability only/)).toBeInTheDocument()
    const row = within(screen.getByTestId('portability-proof-provider-proof-runner'))
    expect(row.getByText('Provider proof runner')).toBeInTheDocument()
    expect(row.getByText('opt-in')).toBeInTheDocument()
    expect(row.getByText('manual live proof')).toBeInTheDocument()
    expect(row.queryAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(0)
    expect(row.queryAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(0)
    expect(row.getByText(/Load a redacted live proof report/)).toBeInTheDocument()
    expect(row.getByTestId('portability-provider-failure-matrix')).toHaveTextContent('Failure-state coverage')
    expect(row.getByTestId('portability-provider-failure-matrix')).toHaveTextContent('0 of 14 recorded')
    expect(row.getByTestId('portability-provider-failure-s3-permission')).toHaveTextContent('needed')
    expect(row.queryByText(/Needs real S3\/Azure credentials/)).not.toBeInTheDocument()
    expect(row.queryByLabelText('Provider proof runner setup checklist')).not.toBeInTheDocument()
    expect(row.getByTestId('portability-proof-setup-summary-provider-proof-runner')).toHaveTextContent('GRIMOIRE_S3_LIVE_WRITE_PROOF')
    expect(row.getByTestId('portability-proof-setup-summary-provider-proof-runner')).toHaveTextContent('GRIMOIRE_AZURE_LIVE_WRITE_PROOF')
    fireEvent.click(row.getByRole('button', { name: 'Developer proof details' }))
    expect(row.getAllByText(/pnpm test:object-storage-live -- --report/)).toHaveLength(1)
    expect(row.getAllByText(/pnpm test:object-storage-live -- --dry-run --report/)).toHaveLength(1)
    expect(row.getByText(/Needs real S3\/Azure credentials/)).toBeInTheDocument()
    expect(row.getByLabelText('Provider proof runner setup checklist')).toBeInTheDocument()
    expect(row.getAllByText('GRIMOIRE_S3_LIVE_WRITE_PROOF').length).toBeGreaterThanOrEqual(1)
    expect(row.getAllByText('GRIMOIRE_S3_BUCKET').length).toBeGreaterThanOrEqual(1)
    expect(row.getAllByText('GRIMOIRE_AZURE_LIVE_WRITE_PROOF').length).toBeGreaterThanOrEqual(1)
    expect(row.getAllByText('GRIMOIRE_AZURE_STORAGE_ACCOUNT').length).toBeGreaterThanOrEqual(1)
    expect(row.getAllByText('GRIMOIRE_AZURE_CONTAINER').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(row.getByRole('button', { name: 'Copy dry run command' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND))
    await waitFor(() => expect(row.getByText('Copied')).toBeInTheDocument())
    fireEvent.click(row.getByRole('button', { name: 'Copy live proof command' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(OBJECT_STORAGE_LIVE_PROOF_COMMAND))
    expect(row.queryByText(/provider-proven sync/i)).not.toBeInTheDocument()
    expect(row.queryByText(/s3:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/azblob:\/\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/\/Users\//i)).not.toBeInTheDocument()
    expect(row.queryByText(/secret/i)).not.toBeInTheDocument()
  })

  it('loads a pasted redacted provider proof report into the runner row', () => {
    render(<PortabilityProofLedger t={t} />)

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
              status: 'failed',
              failure_kind: 'permission',
              failure_stage: 'apply',
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
    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent('S3 provider proof: failed')
    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent('failure permission at apply')
    expect(screen.getByTestId('portability-proof-live-azure-provider-proof')).toHaveTextContent('Azure provider proof: missing config')
    expect(screen.getByTestId('portability-provider-failure-matrix')).toHaveTextContent('2 of 14 recorded')
    expect(screen.getByTestId('portability-provider-failure-s3-permission')).toHaveTextContent('recorded')
    expect(screen.getByTestId('portability-provider-failure-azure-config')).toHaveTextContent('recorded')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('s3://')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('/Users/')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('secret-bucket')
    expect(screen.getByTestId('portability-proof-provider-proof-runner')).not.toHaveTextContent('provider-proven sync')
  })

  it('shows provider preview evidence in the object-storage row without upgrading proof status', () => {
    render(
      <PortabilityProofLedger
        t={t}
        objectStorageProviderPreviewReports={{
          s3Push: {
            provider_id: 's3',
            adapter_phase: 'provider-sdk-adapter',
            prototype_mode: 's3-live-provider',
            direction: 'push',
            mirror_path: 'redacted provider target',
            preview_signature: 'sync-v1:test',
            applied: false,
            files_to_upload: 1,
            files_to_download: 0,
            files_to_delete: 0,
            conflicts: 1,
            excluded_files: 2,
            operations: [
              { kind: 'conflict', path: 's3://secret-bucket/private-prefix/changed.md', reason: 'Provider differs' },
            ],
            sync_report_path: null,
            conflict_artifacts: [],
          },
        }}
      />,
    )

    const objectStorage = screen.getByTestId('portability-proof-object-storage')
    expect(screen.getByTestId('portability-proof-live-s3-provider-push-preview')).toHaveTextContent(
      'S3 provider push preview: reviewed preview',
    )
    expect(screen.getByTestId('portability-proof-live-s3-provider-push-preview')).toHaveTextContent(
      'not provider-proven sync yet',
    )
    expect(objectStorage).not.toHaveTextContent('provider-proven sync achieved')
    expect(objectStorage).not.toHaveTextContent('s3://')
    expect(objectStorage).not.toHaveTextContent('secret-bucket')
    expect(objectStorage).not.toHaveTextContent('private-prefix')
  })

  it('persists only the sanitized proof report across Settings reopen', () => {
    const { unmount } = render(<PortabilityProofLedger t={t} />)

    fireEvent.click(screen.getByRole('button', { name: 'Paste redacted proof report' }))
    fireEvent.change(screen.getByLabelText('Redacted proof report JSON'), {
      target: {
        value: JSON.stringify({
          schema: 'grimoire-object-storage-live-proof-v1',
          generated_at: '2026-05-28T13:00:00Z',
          finished_at: '2026-05-28T13:05:00Z',
          provider_filter: 'all',
          summary: { status: 'passed', message: 'raw /Users/sriinnu/.aws s3://secret-bucket' },
          providers: [
            {
              id: 's3',
              enabled: true,
              gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
              required: { GRIMOIRE_S3_BUCKET: 'set' },
              optional: { GRIMOIRE_S3_REGION: 'missing', GRIMOIRE_S3_PREFIX: 'missing' },
              status: 'passed',
              message: 'AWS_SECRET_ACCESS_KEY leaked in raw provider output',
            },
          ],
        }),
      },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Load report' }))

    const stored = window.localStorage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReport) ?? ''
    expect(stored).toContain('"status":"passed"')
    expect(stored).toContain('"GRIMOIRE_S3_BUCKET":"set"')
    expect(stored).not.toContain('/Users/')
    expect(stored).not.toContain('s3://')
    expect(stored).not.toContain('secret-bucket')
    expect(stored).not.toContain('AWS_SECRET_ACCESS_KEY')

    unmount()
    render(<PortabilityProofLedger t={t} />)

    expect(screen.getByTestId('portability-proof-live-provider-report-summary')).toHaveTextContent('Latest proof report: passed')
    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent('S3 provider proof: passed')
  })

  it('clears the locally cached proof report', () => {
    window.localStorage.setItem(APP_STORAGE_KEYS.objectStorageLiveProofReport, JSON.stringify({
      schema: 'grimoire-object-storage-live-proof-v1',
      generated_at: '2026-05-28T13:00:00Z',
      finished_at: null,
      provider_filter: 's3',
      summary: { status: 'passed', message: 'redacted' },
      providers: [
        {
          id: 's3',
          enabled: true,
          gate: { name: 'GRIMOIRE_S3_LIVE_WRITE_PROOF', state: 'set' },
          required: { GRIMOIRE_S3_BUCKET: 'set' },
          optional: {},
          status: 'passed',
        },
      ],
    }))

    render(<PortabilityProofLedger t={t} />)

    expect(screen.getByTestId('portability-proof-live-s3-provider-proof')).toHaveTextContent('S3 provider proof: passed')
    fireEvent.click(screen.getByRole('button', { name: 'Paste redacted proof report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear pasted proof' }))

    expect(window.localStorage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReport)).toBeNull()
    expect(window.localStorage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory)).toBeNull()
    expect(screen.queryByTestId('portability-proof-live-s3-provider-proof')).not.toBeInTheDocument()
  })

  it('shows reviewed capsule preview proof without leaking local capsule paths', () => {
    render(
      <PortabilityProofLedger
        t={t}
        capsuleExportPreview={{
          format: 'json',
          result: {
            assets_exportable: 2,
            bytes_exportable: 4096,
            files_exportable: 6,
            format: 'json',
            preview_signature: 'capsule-preview-v1:test',
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
            preview_signature: 'capsule-import-preview-v1:test',
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
    render(<PortabilityProofLedger t={t} />)

    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveAttribute('data-loop-status', 'missing')
    expect(screen.getByTestId('portability-capsule-loop-proof')).toHaveTextContent('not paired')
    expect(screen.getByTestId('portability-capsule-loop-step-export-preview')).toHaveAttribute('data-step-status', 'missing')
    expect(screen.getByTestId('portability-capsule-loop-step-import-preview')).toHaveAttribute('data-step-status', 'missing')
  })
})
