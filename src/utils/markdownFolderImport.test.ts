import { describe, expect, it } from 'vitest'
import {
  formatMarkdownImportPreviewToast,
  formatMarkdownImportToast,
  importAppExportIntoVault,
  importAppExportIntoVaultWithProgress,
  importJournalExportIntoVaultWithProgress,
  importMarkdownZipIntoVaultWithProgress,
  previewAppExportIntoVault,
  previewJournalExportIntoVault,
  previewMarkdownFolderImport,
  previewMarkdownZipImport,
} from './markdownFolderImport'

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

  it('summarizes import autopsy previews', () => {
    expect(formatMarkdownImportPreviewToast({
      source_path: '/exports/bear',
      planned_import_root: '/vault/imports/bear',
      notes_to_copy: 3,
      assets_to_copy: 2,
      skipped_files: 1,
      failed_files: 0,
      writes_local_only_report: true,
      preview_signature: 'import-preview-v1:test',
    })).toBe('Preview: 3 notes, 2 assets, 1 skipped; local-only report will be written')
  })

  it('calls the Markdown folder preview command in browser/mock mode', async () => {
    await expect(previewMarkdownFolderImport('/vault', '/exports/bear'))
      .resolves.toMatchObject({
        planned_import_root: '/vault/imports/bear',
        notes_to_copy: 3,
        writes_local_only_report: true,
      })
  })

  it('calls the Markdown ZIP preview command in browser/mock mode', async () => {
    await expect(previewMarkdownZipImport('/vault', '/exports/archive.zip'))
      .resolves.toMatchObject({
        source_path: '/exports/archive.zip',
        planned_import_root: '/vault/imports/archive',
        notes_to_copy: 5,
        writes_local_only_report: true,
      })
  })

  it('reports Markdown ZIP import progress in browser/mock mode', async () => {
    const events: string[] = []

    await expect(importMarkdownZipIntoVaultWithProgress(
      '/vault',
      '/exports/archive.zip',
      'import-preview-v1:test',
      'markdown-zip-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      imported_root: '/vault/imports/archive',
      notes_copied: 5,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('calls the app import command in browser/mock mode', async () => {
    await expect(importAppExportIntoVault('/vault', '/exports/spanda.json', 'spanda', 'import-preview-v1:test'))
      .resolves.toMatchObject({
        imported_root: '/vault/imports/spanda-export',
        notes_copied: 6,
      })
  })

  it('reports app import progress in browser/mock mode', async () => {
    const events: string[] = []

    await expect(importAppExportIntoVaultWithProgress(
      '/vault',
      '/exports/obsidian',
      'obsidian',
      'import-preview-v1:test',
      'obsidian-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      imported_root: '/vault/imports/obsidian-export',
      notes_copied: 4,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('calls the app preview command in browser/mock mode', async () => {
    await expect(previewAppExportIntoVault('/vault', '/exports/obsidian', 'obsidian'))
      .resolves.toMatchObject({
        planned_import_root: '/vault/imports/obsidian-export',
        writes_local_only_report: true,
      })
  })

  it('calls the journal preview command in browser/mock mode', async () => {
    await expect(previewJournalExportIntoVault('/vault', '/exports/day-one.zip', 'day-one'))
      .resolves.toMatchObject({
        planned_import_root: '/vault/imports/day-one-export',
        writes_local_only_report: true,
      })
  })

  it('reports journal import progress in browser/mock mode', async () => {
    const events: string[] = []

    await expect(importJournalExportIntoVaultWithProgress(
      '/vault',
      '/exports/day-one.zip',
      'day-one',
      'import-preview-v1:test',
      'day-one-test',
      (event) => events.push(event.event),
    )).resolves.toMatchObject({
      imported_root: '/vault/imports/day-one-export',
      notes_copied: 8,
    })

    expect(events).toEqual(['Started', 'Progress', 'Finished'])
  })

  it('maps Notion folder imports to the Notion backend adapter', async () => {
    await expect(importAppExportIntoVault('/vault', '/exports/notion', 'notion-folder', 'import-preview-v1:test'))
      .resolves.toMatchObject({
        imported_root: '/vault/imports/notion-markdown-export',
      })
  })
})
