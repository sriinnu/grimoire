import { describe, expect, it } from 'vitest'
import {
  getVaultStorageProvider,
  getVaultStorageHealth,
  isFilesystemBackedStorageProvider,
  isVaultPathInStorageProvider,
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
} from './vaultPortability'

describe('vaultPortability', () => {
  it('keeps plain markdown and git as ready portability paths', () => {
    expect(listVaultImportSources()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'markdown-folder', status: 'ready', preservesMarkdown: true }),
      expect.objectContaining({ id: 'markdown-zip', status: 'ready', preservesMarkdown: true }),
    ]))
    expect(listVaultExportTargets()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'vault-folder', status: 'ready', portable: true }),
      expect.objectContaining({ id: 'git-remote', status: 'ready', portable: true }),
      expect.objectContaining({ id: 'markdown-zip', status: 'ready', portable: true }),
      expect.objectContaining({ id: 'static-html', status: 'ready', portable: true }),
    ]))
  })

  it('tracks requested app importers and storage providers', () => {
    expect(listVaultImportSources().map(source => source.id)).toEqual(expect.arrayContaining([
      'bear',
      'day-one',
      'journey',
      'apple-journal',
      'obsidian',
      'notion-markdown',
      'spanda',
    ]))
    expect(listVaultImportSources()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'obsidian', status: 'ready', preservesMarkdown: true }),
      expect.objectContaining({ id: 'notion-markdown', status: 'ready' }),
      expect.objectContaining({ id: 'spanda', status: 'ready' }),
      expect.objectContaining({ id: 'apple-journal', status: 'ready' }),
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
    expect(getVaultStorageProvider('icloud-drive')).toMatchObject({
      status: 'ready',
      kind: 'cloud-folder',
    })
  })

  it('keeps object storage as adapter work instead of editing buckets directly', () => {
    expect(getVaultStorageProvider('s3')).toMatchObject({
      status: 'planned',
      kind: 'object-storage',
      localFirst: true,
      requiresLocalWorkingCopy: true,
    })
    expect(getVaultStorageProvider('azure-blob')).toMatchObject({
      status: 'planned',
      kind: 'object-storage',
      localFirst: true,
      requiresLocalWorkingCopy: true,
    })
  })

  it('distinguishes filesystem-backed folders from object storage adapters', () => {
    const iCloud = getVaultStorageProvider('icloud-drive')
    const s3 = getVaultStorageProvider('s3')

    expect(iCloud && isFilesystemBackedStorageProvider(iCloud)).toBe(true)
    expect(s3 && isFilesystemBackedStorageProvider(s3)).toBe(false)
  })

  it('never treats object-storage URLs as active vault folders', () => {
    expect(isVaultPathInStorageProvider('s3', 's3://my-bucket/grimoire')).toBe(false)
    expect(isVaultPathInStorageProvider('azure-blob', 'https://acct.blob.core.windows.net/vault')).toBe(false)
  })

  it('detects filesystem-backed cloud vaults from normal desktop paths', () => {
    const iCloudPath = '/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire'
    const googlePath = '/Users/sri/Library/CloudStorage/GoogleDrive-sri@example.com/My Drive/Grimoire'

    expect(isVaultPathInStorageProvider('icloud-drive', iCloudPath)).toBe(true)
    expect(isVaultPathInStorageProvider('google-drive-desktop', googlePath)).toBe(true)
    expect(isVaultPathInStorageProvider('icloud-drive', googlePath)).toBe(false)
  })

  it('returns storage health without claiming planned object storage is live', () => {
    const health = getVaultStorageHealth('/Users/sri/Grimoire')

    expect(health).toEqual(expect.arrayContaining([
      expect.objectContaining({ providerId: 'local-folder', state: 'active' }),
      expect.objectContaining({ providerId: 'icloud-drive', state: 'not_selected' }),
      expect.objectContaining({ providerId: 's3', state: 'planned' }),
      expect.objectContaining({ providerId: 'azure-blob', state: 'planned' }),
    ]))
  })

  it('explains active cloud-folder privacy without weakening local-first storage', () => {
    const health = getVaultStorageHealth('/Users/sri/Library/CloudStorage/GoogleDrive-sri@example.com/My Drive/Grimoire')

    expect(health).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerId: 'google-drive-desktop',
        state: 'active',
        privacyNote: expect.stringContaining('Grimoire only edits the local files'),
      }),
    ]))
    expect(getVaultStorageProvider('google-drive-desktop')).toMatchObject({
      localFirst: true,
      requiresLocalWorkingCopy: true,
    })
  })
})
