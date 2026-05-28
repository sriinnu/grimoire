import { describe, expect, it } from 'vitest'
import {
  exportMarkdownZipWithProgress,
  exportStaticHtmlArchiveWithProgress,
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
