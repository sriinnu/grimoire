import { describe, expect, it } from 'vitest'
import { formatMarkdownZipExportToast } from './vaultExport'

describe('vaultExport', () => {
  it('summarizes exported file counts', () => {
    expect(formatMarkdownZipExportToast({
      export_path: '/tmp/grimoire.zip',
      files_exported: 2,
      skipped_files: 1,
    })).toBe('Exported 2 files to Markdown ZIP')
  })
})
