import { describe, expect, it, vi } from 'vitest'
import { formatShortcutDisplay } from '../appCommandCatalog'
import { buildSettingsCommands } from './settingsCommands'

describe('buildSettingsCommands', () => {
  it('adds a discoverable H1 auto-rename settings command', () => {
    const onOpenSettings = vi.fn()

    const commands = buildSettingsCommands({ onOpenSettings })
    const command = commands.find((item) => item.id === 'open-h1-auto-rename-setting')

    expect(command).toMatchObject({
      label: 'Open H1 Auto-Rename Setting',
      enabled: true,
      group: 'Settings',
    })

    command?.execute()
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('keeps the general settings command available', () => {
    const onOpenSettings = vi.fn()

    const commands = buildSettingsCommands({ onOpenSettings })

    expect(commands.find((item) => item.id === 'open-settings')).toMatchObject({
      label: 'Open Settings',
      shortcut: formatShortcutDisplay({ display: '⌘,' }),
      enabled: true,
    })
  })

  it('indexes current theme presets without retired theme keywords', () => {
    const commands = buildSettingsCommands({ onOpenSettings: vi.fn() })
    const keywords = commands.find((item) => item.id === 'open-settings')?.keywords ?? []

    expect(keywords).toEqual(expect.arrayContaining([
      'constellation',
      'daylight',
      'atelier',
      'prabhat',
      'studio',
      'living',
      'archive',
      'nocturne',
      'retro',
      'terminal',
    ]))
    expect(keywords).not.toEqual(expect.arrayContaining([
      '2050',
      'aether',
      'ion',
      'moss',
      'lumen',
    ]))
  })

  it('adds a discoverable language settings command', () => {
    const onOpenSettings = vi.fn()

    const commands = buildSettingsCommands({ onOpenSettings })
    const command = commands.find((item) => item.id === 'open-language-settings')

    expect(command).toMatchObject({
      label: 'Open Language Settings',
      enabled: true,
      group: 'Settings',
    })

    command?.execute()
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('adds language switch commands when a setter is available', () => {
    const onOpenSettings = vi.fn()
    const onSetUiLanguage = vi.fn()

    const commands = buildSettingsCommands({
      onOpenSettings,
      selectedUiLanguage: 'en',
      onSetUiLanguage,
    })

    const chinese = commands.find((item) => item.id === 'switch-language-zh-hans')
    expect(chinese).toMatchObject({
      label: 'Switch Language to Simplified Chinese',
      enabled: true,
    })

    chinese?.execute()
    expect(onSetUiLanguage).toHaveBeenCalledWith('zh-Hans')
  })

  it('adds German Hindi and Sanskrit language switch commands', () => {
    const onSetUiLanguage = vi.fn()

    const commands = buildSettingsCommands({
      onOpenSettings: vi.fn(),
      selectedUiLanguage: 'en',
      onSetUiLanguage,
    })

    expect(commands.find((item) => item.id === 'switch-language-de')).toMatchObject({
      label: 'Switch Language to German',
      keywords: expect.arrayContaining(['german', 'deutsch']),
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'switch-language-hi')).toMatchObject({
      label: 'Switch Language to Hindi',
      keywords: expect.arrayContaining(['hindi', 'हिन्दी']),
    })
    const sanskrit = commands.find((item) => item.id === 'switch-language-sa')
    expect(sanskrit).toMatchObject({
      label: 'Switch Language to Sanskrit',
      keywords: expect.arrayContaining(['sanskrit', 'संस्कृत']),
    })

    sanskrit?.execute()
    expect(onSetUiLanguage).toHaveBeenCalledWith('sa')
  })

  it('localizes language commands', () => {
    const commands = buildSettingsCommands({
      onOpenSettings: vi.fn(),
      locale: 'zh-Hans',
      systemLocale: 'zh-Hans',
      selectedUiLanguage: 'system',
      onSetUiLanguage: vi.fn(),
    })

    expect(commands.find((item) => item.id === 'open-language-settings')).toMatchObject({
      label: '打开语言设置',
    })
    expect(commands.find((item) => item.id === 'use-system-language')).toMatchObject({
      label: '使用系统语言 (简体中文)',
      enabled: false,
    })
  })

  it('adds a create-empty-vault command when the handler is available', () => {
    const onOpenSettings = vi.fn()
    const onCreateEmptyVault = vi.fn()

    const commands = buildSettingsCommands({ onOpenSettings, onCreateEmptyVault })
    const command = commands.find((item) => item.id === 'create-empty-vault')

    expect(command).toMatchObject({
      label: 'Create Empty Vault…',
      enabled: true,
      group: 'Settings',
    })

    command?.execute()
    expect(onCreateEmptyVault).toHaveBeenCalledTimes(1)
  })

  it('adds a Finder reveal command for the active vault', () => {
    const onRevealVaultInFinder = vi.fn()

    const commands = buildSettingsCommands({
      onOpenSettings: vi.fn(),
      onRevealVaultInFinder,
    })
    const command = commands.find((item) => item.id === 'reveal-vault-in-finder')

    expect(command).toMatchObject({
      label: 'Reveal Vault in Finder',
      enabled: true,
      group: 'Settings',
      keywords: expect.arrayContaining(['vault', 'finder', 'local']),
    })

    command?.execute()
    expect(onRevealVaultInFinder).toHaveBeenCalledTimes(1)
  })
})
