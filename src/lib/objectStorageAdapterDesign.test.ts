import { describe, expect, it } from 'vitest'
import {
  getObjectStorageAdapterDesign,
  hasPlannedObjectStorageAdapter,
  listObjectStorageAdapterDesigns,
} from './objectStorageAdapterDesign'

describe('objectStorageAdapterDesign', () => {
  it('keeps S3 and Azure as planned local-working-copy adapters', () => {
    expect(listObjectStorageAdapterDesigns()).toEqual([
      expect.objectContaining({
        providerId: 's3',
        adapterPhase: 'local-mirror-prototype',
        prototypeMode: 'local-mirror-fixture',
        syncModel: 'local-working-copy-mirror',
        writePolicy: 'never-edit-remote-directly',
      }),
      expect.objectContaining({
        providerId: 'azure-blob',
        adapterPhase: 'local-mirror-prototype',
        prototypeMode: 'local-mirror-fixture',
        syncModel: 'local-working-copy-mirror',
        writePolicy: 'never-edit-remote-directly',
      }),
    ])
    expect(hasPlannedObjectStorageAdapter('s3')).toBe(true)
    expect(hasPlannedObjectStorageAdapter('azure-blob')).toBe(true)
  })

  it('keeps credentials local and out of vault files', () => {
    for (const design of listObjectStorageAdapterDesigns()) {
      expect(design.credentialLocation).toBe('local-machine-settings-or-keychain')
      expect(design.requiredSettings).toEqual(expect.arrayContaining([
        expect.objectContaining({ key: 'credentialRef', secret: true, required: true }),
      ]))
      expect(design.privacyNotes.join(' ')).toContain('never in the vault')
    }
  })

  it('requires preview/apply sync commands and visible conflict artifacts', () => {
    const s3 = getObjectStorageAdapterDesign('s3')

    expect(s3?.plannedCommands).toEqual(expect.arrayContaining([
      'storage_health_check',
      'storage_pull_preview',
      'storage_push_preview',
      'storage_sync_apply',
    ]))
    expect(s3?.conflictPolicy).toBe('write-markdown-conflict-artifacts')
  })

  it('excludes local-only lanes from object-storage sync by default', () => {
    const azure = getObjectStorageAdapterDesign('azure-blob')

    expect(azure?.localityPolicy).toBe('exclude-local-only-by-default')
    expect(azure?.privacyNotes.join(' ')).toContain('Local-only lanes are excluded')
  })
})
