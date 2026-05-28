import { describe, expect, it } from 'vitest'
import {
  formatPortabilityCapsuleImportPreviewToast,
  formatPortabilityCapsuleImportToast,
  importPortabilityCapsuleIntoVault,
  previewPortabilityCapsuleImport,
} from './portabilityCapsuleImport'

describe('portabilityCapsuleImport', () => {
  it('summarizes capsule preview and import results', () => {
    expect(formatPortabilityCapsuleImportPreviewToast({
      source_path: '/exports/grimoire.json',
      planned_import_root: '/vault/imports/grimoire',
      preview_signature: 'capsule-import-preview-v1:test',
      notes_to_copy: 2,
      assets_to_copy: 1,
      skipped_files: 1,
      failed_files: 0,
      writes_local_only_report: true,
    }, 'json')).toBe('Previewed JSON snapshot import: 2 notes, 1 asset, 1 withheld; no writes yet')

    expect(formatPortabilityCapsuleImportToast({
      imported_root: '/vault/imports/grimoire',
      report_path: '/vault/imports/grimoire/import-report.md',
      notes_copied: 2,
      assets_copied: 1,
      skipped_files: 1,
      failed_files: 0,
    }, 'sqlite')).toBe('Imported SQLite snapshot: 2 notes and 1 asset; withheld 1')
  })

  it('calls capsule preview and import commands in browser/mock mode', async () => {
    await expect(previewPortabilityCapsuleImport('/vault', '/exports/grimoire.json', 'json'))
      .resolves.toMatchObject({
        planned_import_root: '/vault/imports/grimoire',
        notes_to_copy: 8,
        skipped_files: 1,
        writes_local_only_report: true,
      })

    await expect(importPortabilityCapsuleIntoVault('/vault', '/exports/grimoire.sqlite', 'sqlite', 'capsule-import-preview-v1:test'))
      .resolves.toMatchObject({
        imported_root: '/vault/imports/grimoire',
        notes_copied: 8,
        skipped_files: 2,
      })
  })
})
