import { describe, expect, it } from 'vitest'
import {
  buildVaultCreationPlan,
  buildVaultTargetPath,
  getVaultStorageChoice,
  getVaultTemplateKind,
  sanitizeVaultFolderName,
} from './vaultCreation'

describe('vaultCreation', () => {
  it('builds local-first target paths for supported storage choices', () => {
    expect(buildVaultTargetPath('local', 'Dream Journal')).toBe('~/Grimoire/Vaults/Dream Journal')
    expect(buildVaultTargetPath('icloud', 'Dream Journal')).toBe('~/Library/Mobile Documents/com~apple~CloudDocs/Grimoire/Dream Journal')
    expect(buildVaultTargetPath('google-drive', 'Dream Journal')).toBe('~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire/Dream Journal')
  })

  it('keeps folder names readable while stripping path separators', () => {
    expect(sanitizeVaultFolderName(' Dreams / 2026 : private ')).toBe('Dreams - 2026 - private')
    expect(sanitizeVaultFolderName('///')).toBe('New Vault')
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
      targetPath: '~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire/Dreams',
      templateKind: 'dreams',
    })).toMatchObject({
      storageDetail: 'Google Drive is still a local folder. Grimoire stores no cloud credentials.',
      syncDetail: 'Git stays off. The vault opens and saves as plain Markdown without a repo.',
      templateLabel: 'Dreams',
    })

    expect(buildVaultCreationPlan({
      choiceId: 'local',
      initializeGit: true,
      targetPath: '~/Grimoire/Vaults/Work',
      templateKind: 'work-log',
    }).syncDetail).toContain('Git history starts')
  })
})
