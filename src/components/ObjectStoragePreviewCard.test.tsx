import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { ObjectStoragePreviewCard } from './ObjectStoragePreviewCard'

const baseReport: ObjectStorageSyncReport = {
  provider_id: 's3',
  adapter_phase: 'local-mirror-prototype',
  prototype_mode: 'local-mirror-fixture',
  direction: 'push',
  mirror_path: '/Users/sri/Private/Mirrors/s3-bucket',
  preview_signature: 'sync-v1-test',
  applied: false,
  files_to_upload: 2,
  files_to_download: 0,
  files_to_delete: 1,
  conflicts: 1,
  excluded_files: 1,
  operations: [
    { kind: 'conflict', path: 'Notes/changed.md', reason: 'Local and mirror differ' },
    { kind: 'exclude', path: 'Journal/private.md', reason: 'Protected by local-only policy' },
  ],
  sync_report_path: null,
  conflict_artifacts: [],
}

describe('ObjectStoragePreviewCard', () => {
  it('keeps local mirror previews useful without exposing absolute local paths', () => {
    render(<ObjectStoragePreviewCard report={baseReport} target="mirror" />)

    const card = screen.getByTestId('object-storage-s3-mirror-push-preview')
    expect(card).toHaveTextContent('S3 push: s3-bucket')
    expect(card).toHaveTextContent('Conflicts: Notes/changed.md (Local and mirror differ)')
    expect(card).toHaveTextContent('Local-only withheld: Journal/private.md (Protected by local-only policy)')
    expect(card).not.toHaveTextContent('/Users/sri/Private')
  })

  it('redacts S3 provider targets from titles and operation summaries', () => {
    render(
      <ObjectStoragePreviewCard
        target="provider"
        report={{
          ...baseReport,
          adapter_phase: 'provider-sdk-adapter',
          prototype_mode: 's3-live-provider',
          mirror_path: 's3://sriinnu-vault/private-prefix/',
          operations: [
            { kind: 'conflict', path: 's3://sriinnu-vault/private-prefix/changed.md', reason: 'Provider object differs' },
          ],
        }}
      />,
    )

    const card = screen.getByTestId('object-storage-s3-provider-push-preview')
    expect(card).toHaveTextContent('S3 push: redacted provider target')
    expect(card).toHaveTextContent('Conflicts: redacted provider target (Provider object differs)')
    expect(card).not.toHaveTextContent('s3://')
    expect(card).not.toHaveTextContent('sriinnu-vault')
    expect(card).not.toHaveTextContent('private-prefix')
  })

  it('redacts Azure provider targets from titles and operation summaries', () => {
    render(
      <ObjectStoragePreviewCard
        target="provider"
        report={{
          ...baseReport,
          provider_id: 'azure-blob',
          adapter_phase: 'provider-sdk-adapter',
          prototype_mode: 'azure-live-provider',
          mirror_path: 'azblob://secret-account/vault/private-prefix',
          operations: [
            { kind: 'conflict', path: 'azblob://secret-account/vault/private-prefix/changed.md', reason: 'Provider object differs' },
          ],
        }}
      />,
    )

    const card = screen.getByTestId('object-storage-azure-blob-provider-push-preview')
    expect(card).toHaveTextContent('Azure Blob push: redacted provider target')
    expect(card).toHaveTextContent('Conflicts: redacted provider target (Provider object differs)')
    expect(card).not.toHaveTextContent('azblob://')
    expect(card).not.toHaveTextContent('secret-account')
    expect(card).not.toHaveTextContent('private-prefix')
  })
})
