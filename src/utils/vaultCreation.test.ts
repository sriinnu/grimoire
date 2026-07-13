import { describe, expect, it } from 'vitest'
import {
  buildVaultStorageChoices,
  buildVaultCreationPlan,
  buildVaultTargetPath,
  getVaultStorageChoice,
  getVaultTemplateKind,
  sanitizeVaultFolderName,
} from './vaultCreation'

describe('vaultCreation', () => {
  it('builds macOS local-first target paths for supported storage choices', () => {
    expect(buildVaultTargetPath('local', 'Dream Journal', 'macos')).toBe('~/Grimoire/Notebooks/Dream Journal')
    expect(buildVaultTargetPath('icloud', 'Dream Journal', 'macos')).toBe('~/Library/Mobile Documents/com~apple~CloudDocs/Grimoire/Dream Journal')
    expect(buildVaultTargetPath('google-drive', 'Dream Journal', 'macos')).toBe('~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire/Dream Journal')
  })

  it('builds Windows local-first target paths instead of macOS Library paths', () => {
    expect(buildVaultTargetPath('local', 'Dream Journal', 'windows')).toBe('~/Documents/Grimoire/Notebooks/Dream Journal')
    expect(buildVaultTargetPath('icloud', 'Dream Journal', 'windows')).toBe('~/iCloudDrive/Grimoire/Dream Journal')
    expect(buildVaultTargetPath('google-drive', 'Dream Journal', 'windows')).toBe('~/My Drive/Grimoire/Dream Journal')
    expect(buildVaultTargetPath('synced-folder', 'Dream Journal', 'windows')).toBe('~/OneDrive/Grimoire/Dream Journal')
    expect(buildVaultStorageChoices('windows').map((choice) => choice.basePath)).not.toContain(
      '~/Library/CloudStorage/Grimoire',
    )
  })

  it('keeps folder names readable while stripping path separators', () => {
    expect(sanitizeVaultFolderName(' Dreams / 2026 : private ')).toBe('Dreams - 2026 - private')
    expect(sanitizeVaultFolderName('///')).toBe('New Notebook')
  })

  it('avoids Windows reserved device names before creating the notebook path', () => {
    expect(sanitizeVaultFolderName('con')).toBe('con Notebook')
    expect(sanitizeVaultFolderName('LPT1.')).toBe('LPT1 Notebook')
    expect(sanitizeVaultFolderName('aux.md')).toBe('aux.md Notebook')
    expect(buildVaultTargetPath('local', 'nul', 'windows')).toBe('~/Documents/Grimoire/Notebooks/nul Notebook')
  })

  it('falls back to local storage for unknown choices', () => {
    expect(getVaultStorageChoice('missing' as never).storageProvider).toBe('local-folder')
  })

  it('exposes local-first vault templates for private lanes', () => {
    expect(getVaultTemplateKind('dreams').defaultName).toBe('Dreams')
    expect(getVaultTemplateKind('personal-os').detail).toContain('memory')
    expect(getVaultTemplateKind('missing' as never).id).toBe('blank')
  })

  it('describes create-vault storage and Git without hiding setup facts', () => {
    expect(buildVaultCreationPlan({
      choiceId: 'google-drive',
      initializeGit: false,
      platform: 'macos',
      targetPath: '~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire/Dreams',
      templateKind: 'dreams',
    })).toMatchObject({
      experienceDetail: 'Paper canvas, Ledger graph, comfortable density.',
      experienceLabel: 'Aurora',
      storageDetail: 'Google Drive is still a local folder. Grimoire stores no cloud credentials.',
      syncDetail: 'Git stays off. The vault opens and saves as plain Markdown without a repo.',
      templateLabel: 'Dreams',
    })

    expect(buildVaultCreationPlan({
      choiceId: 'local',
      initializeGit: true,
      platform: 'windows',
      targetPath: '~/Grimoire/Notebooks/Work',
      templateKind: 'work-log',
      themePreset: 'morning-notebook',
    }).syncDetail).toContain('Git history starts')
    expect(buildVaultCreationPlan({
      choiceId: 'local',
      initializeGit: true,
      platform: 'windows',
      targetPath: '~/Grimoire/Notebooks/Work',
      templateKind: 'work-log',
      themePreset: 'morning-notebook',
    }).experienceDetail).toBe('Paper canvas, Ledger graph, comfortable density.')
  })
})
