import { describe, expect, it } from 'vitest'
import {
  exportMarkdownZipWithProgress,
  exportStaticHtmlArchiveWithProgress,
  formatPortabilityCapsuleExportToast,
  formatPortabilityCapsulePreviewToast,
  formatMarkdownZipExportToast,
  formatStaticHtmlExportToast,
} from './vaultExport'

describe('vaultExport', () => {
  it('summarizes exported file counts', () => {
    expect(formatMarkdownZipExportToast({
      export_path: '/tmp/grimoire.zip',
      files_exported: 2,
      skipped_files: 1,
    })).toBe('Exported 2 files to Markdown ZIP; withheld 1 local-only file')
    expect(formatStaticHtmlExportToast({
      export_path: '/tmp/grimoire-site',
      files_exported: 3,
      skipped_files: 2,
    })).toBe('Exported 3 files to static HTML; withheld 2 local-only files')
    expect(formatPortabilityCapsulePreviewToast({
      format: 'json',
      preview_signature: 'capsule-preview-v1:test',
      files_exportable: 4,
      notes_exportable: 3,
      assets_exportable: 1,
      skipped_files: 2,
      bytes_exportable: 1024,
      locality_proof: {
        markdown_source_of_truth: true,
        absolute_source_paths_redacted: true,
        local_only_files_withheld: 2,
      },
      manifest_rows: [],
    })).toBe('Previewed JSON snapshot: 4 files exportable; will withhold 2 local-only files')
    expect(formatPortabilityCapsuleExportToast({
      export_path: '/tmp/grimoire.sqlite',
      files_exported: 1,
      skipped_files: 0,
    }, 'sqlite')).toBe('Exported 1 file to SQLite snapshot')
  })

  it('reports browser-fallback Markdown ZIP export progress', async () => {
    const events: string[] = []

    await expect(exportMarkdownZipWithProgress(
      '/vault',
      '/tmp/grimoire.zip',
      'export-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      export_path: '/tmp/grimoire.zip',
      files_exported: 12,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('reports browser-fallback static HTML export progress', async () => {
    const events: string[] = []

    await expect(exportStaticHtmlArchiveWithProgress(
      '/vault',
      '/tmp/grimoire-site',
      'export-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      export_path: '/tmp/grimoire-site',
      files_exported: 10,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })
})
