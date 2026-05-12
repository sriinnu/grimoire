import { describe, expect, it } from 'vitest'
import { formatMarkdownImportToast } from './markdownFolderImport'

describe('markdownFolderImport', () => {
  it('summarizes copied notes, assets, and failures', () => {
    expect(formatMarkdownImportToast({
      imported_root: '/vault/imports/source',
      report_path: '/vault/imports/source/import-report.md',
      notes_copied: 2,
      assets_copied: 1,
      skipped_files: 4,
      failed_files: 1,
    })).toBe('Imported 2 notes and 1 asset; 1 failed')
  })

  it('uses singular copy for one note and omits empty asset/failure parts', () => {
    expect(formatMarkdownImportToast({
      imported_root: '/vault/imports/source',
      report_path: '/vault/imports/source/import-report.md',
      notes_copied: 1,
      assets_copied: 0,
      skipped_files: 0,
      failed_files: 0,
    })).toBe('Imported 1 note')
  })
})
