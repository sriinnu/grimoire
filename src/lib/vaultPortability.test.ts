import { describe, expect, it } from 'vitest'
import {
  getVaultStorageProvider,
  isFilesystemBackedStorageProvider,
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
} from './vaultPortability'

describe('vaultPortability', () => {
  it('keeps plain markdown and git as ready portability paths', () => {
    expect(listVaultImportSources()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'markdown-folder', status: 'ready', preservesMarkdown: true }),
    ]))
    expect(listVaultExportTargets()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'vault-folder', status: 'ready', portable: true }),
      expect.objectContaining({ id: 'git-remote', status: 'ready', portable: true }),
    ]))
  })

  it('tracks requested app importers and cloud storage providers as planned work', () => {
    expect(listVaultImportSources().map(source => source.id)).toEqual(expect.arrayContaining([
      'bear',
      'day-one',
      'obsidian',
      'notion-markdown',
    ]))
    expect(listVaultStorageProviders().map(provider => provider.id)).toEqual(expect.arrayContaining([
      'icloud-drive',
      'google-drive-desktop',
      's3',
      'azure-blob',
    ]))
  })

  it('keeps every storage provider local-first', () => {
    expect(listVaultStorageProviders().every(provider => provider.localFirst)).toBe(true)
    expect(getVaultStorageProvider('git')).toMatchObject({
      status: 'ready',
      requiresLocalWorkingCopy: true,
    })
  })

  it('distinguishes filesystem-backed folders from object storage adapters', () => {
    const iCloud = getVaultStorageProvider('icloud-drive')
    const s3 = getVaultStorageProvider('s3')

    expect(iCloud && isFilesystemBackedStorageProvider(iCloud)).toBe(true)
    expect(s3 && isFilesystemBackedStorageProvider(s3)).toBe(false)
  })
})
