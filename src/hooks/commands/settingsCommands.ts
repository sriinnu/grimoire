import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../appCommandCatalog'
import type { CommandAction } from './types'
import { rememberFeedbackDialogOpener } from '../../lib/feedbackDialogOpener'
import {
  APP_LOCALES,
  SYSTEM_UI_LANGUAGE,
  localeDisplayName,
  type AppLocale,
  type UiLanguagePreference,
} from '../../lib/i18nCore'
import { createCommandTranslator } from '../../lib/i18nCommands'

interface SettingsCommandsConfig {
  mcpStatus?: string
  vaultCount?: number
  isGettingStartedHidden?: boolean
  onOpenSettings: () => void
  onOpenFeedback?: () => void
  onOpenVault?: () => void
  onCreateEmptyVault?: () => void
  onRemoveActiveVault?: () => void
  onRestoreGettingStarted?: () => void
  onCheckForUpdates?: () => void
  onInstallMcp?: () => void
  onReloadVault?: () => void
  onRepairVault?: () => void
  onRevealVaultInFinder?: () => void
  locale?: AppLocale
  systemLocale?: AppLocale
  selectedUiLanguage?: UiLanguagePreference
  onSetUiLanguage?: (language: UiLanguagePreference) => void
}

function commandKeywords(raw: string): string[] {
  return raw.split(/\s+/).filter(Boolean)
}

function commandIdForLocale(locale: AppLocale): string {
  return `switch-language-${locale.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function languageKeywords(locale: AppLocale): string[] {
  const common = ['language', 'locale']
  if (locale === 'en') return [...common, 'english', 'en']
  if (locale === 'zh-Hans') return [...common, 'chinese', 'simplified', 'zh', '中文']
  if (locale === 'de') return [...common, 'german', 'deutsch', 'de']
  if (locale === 'hi') return [...common, 'hindi', 'hi', 'हिन्दी', 'हिंदी']
  return [...common, 'sanskrit', 'sa', 'संस्कृत', 'संस्कृतम्']
}

function buildPrimarySettingsCommands({
  locale = 'en',
  onOpenSettings,
  onOpenFeedback,
  onCheckForUpdates,
}: Pick<SettingsCommandsConfig, 'locale' | 'onOpenSettings' | 'onOpenFeedback' | 'onCheckForUpdates'>): CommandAction[] {
  const t = createCommandTranslator(locale)
  return [
    {
      id: 'open-settings',
      label: t('command.openSettings'),
      group: 'Settings' as const,
      shortcut: getAppCommandShortcutDisplay(APP_COMMAND_IDS.appSettings),
      keywords: commandKeywords(t('command.openSettings.keywords')),
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'open-h1-auto-rename-setting',
      label: t('command.openH1Setting'),
      group: 'Settings' as const,
      keywords: ['h1', 'title', 'filename', 'rename', 'auto', 'untitled', 'sync', 'preference'],
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'open-contribute',
      label: t('command.contribute'),
      group: 'Settings',
      keywords: ['contribute', 'feedback', 'feature', 'canny', 'discussion', 'github', 'bug', 'report'],
      enabled: !!onOpenFeedback,
      execute: () => {
        rememberFeedbackDialogOpener(document.activeElement instanceof HTMLElement ? document.activeElement : null)
        onOpenFeedback?.()
      },
    },
    { id: 'check-updates', label: t('command.checkUpdates'), group: 'Settings', keywords: ['update', 'version', 'upgrade', 'release'], enabled: true, execute: () => onCheckForUpdates?.() },
  ]
}

function buildLanguageCommands({
  locale = 'en',
  systemLocale = locale,
  selectedUiLanguage = SYSTEM_UI_LANGUAGE,
  onOpenSettings,
  onSetUiLanguage,
}: Pick<SettingsCommandsConfig, 'locale' | 'systemLocale' | 'selectedUiLanguage' | 'onOpenSettings' | 'onSetUiLanguage'>): CommandAction[] {
  const t = createCommandTranslator(locale)
  const canSwitchLanguage = !!onSetUiLanguage

  return [
    {
      id: 'open-language-settings',
      label: t('command.openLanguageSettings'),
      group: 'Settings',
      keywords: commandKeywords(t('command.openLanguageSettings.keywords')),
      enabled: true,
      execute: onOpenSettings,
    },
    {
      id: 'use-system-language',
      label: `${t('command.useSystemLanguage')} (${localeDisplayName(systemLocale, locale)})`,
      group: 'Settings',
      keywords: ['language', 'locale', 'system', 'auto'],
      enabled: canSwitchLanguage && selectedUiLanguage !== SYSTEM_UI_LANGUAGE,
      execute: () => onSetUiLanguage?.(SYSTEM_UI_LANGUAGE),
    },
    ...APP_LOCALES.map((targetLocale) => ({
      id: commandIdForLocale(targetLocale),
      label: t('command.switchLanguageTo', {
        language: localeDisplayName(targetLocale, locale),
      }),
      group: 'Settings' as const,
      keywords: languageKeywords(targetLocale),
      enabled: canSwitchLanguage && selectedUiLanguage !== targetLocale,
      execute: () => onSetUiLanguage?.(targetLocale),
    })),
  ]
}

function buildVaultSettingsCommands({
  vaultCount,
  isGettingStartedHidden,
  onOpenVault,
  onCreateEmptyVault,
  onRemoveActiveVault,
  onRestoreGettingStarted,
  onRevealVaultInFinder,
}: Pick<SettingsCommandsConfig, 'vaultCount' | 'isGettingStartedHidden' | 'onOpenVault' | 'onCreateEmptyVault' | 'onRemoveActiveVault' | 'onRestoreGettingStarted' | 'onRevealVaultInFinder'>): CommandAction[] {
  return [
    { id: 'create-empty-vault', label: 'Create Empty Notebook…', group: 'Settings', keywords: ['notebook', 'vault', 'create', 'new', 'empty', 'folder', 'create empty notebook', 'create empty vault'], enabled: !!onCreateEmptyVault, execute: () => onCreateEmptyVault?.() },
    { id: 'open-vault', label: 'Open Notebook…', group: 'Settings', keywords: ['notebook', 'vault', 'folder', 'switch', 'open', 'workspace', 'open vault'], enabled: true, execute: () => onOpenVault?.() },
    { id: 'reveal-vault-in-finder', label: 'Reveal Notebook in Finder', group: 'Settings', keywords: ['notebook', 'vault', 'finder', 'reveal', 'folder', 'local', 'files', 'reveal vault'], enabled: !!onRevealVaultInFinder, execute: () => onRevealVaultInFinder?.() },
    { id: 'remove-vault', label: 'Remove Notebook from List', group: 'Settings', keywords: ['notebook', 'vault', 'remove', 'disconnect', 'hide', 'remove vault'], enabled: (vaultCount ?? 0) > 1 && !!onRemoveActiveVault, execute: () => onRemoveActiveVault?.() },
    { id: 'restore-getting-started', label: 'Restore Getting Started Notebook', group: 'Settings', keywords: ['notebook', 'vault', 'restore', 'demo', 'getting started', 'reset', 'restore getting started vault'], enabled: !!isGettingStartedHidden && !!onRestoreGettingStarted, execute: () => onRestoreGettingStarted?.() },
  ]
}

function buildMaintenanceCommands({
  mcpStatus,
  onInstallMcp,
  onReloadVault,
  onRepairVault,
}: Pick<SettingsCommandsConfig, 'mcpStatus' | 'onInstallMcp' | 'onReloadVault' | 'onRepairVault'>): CommandAction[] {
  return [
    {
      id: 'install-mcp',
      label: mcpStatus === 'installed' ? 'Manage External AI Tools…' : 'Set Up External AI Tools…',
      group: 'Settings',
      keywords: ['mcp', 'ai', 'tools', 'external', 'setup', 'connect', 'disconnect', 'claude', 'codex', 'cursor', 'consent'],
      enabled: true,
      execute: () => onInstallMcp?.(),
    },
    { id: 'reload-vault', label: 'Reload Notebook', group: 'Settings', keywords: ['reload', 'refresh', 'rescan', 'sync', 'filesystem', 'cache', 'vault'], enabled: !!onReloadVault, execute: () => onReloadVault?.() },
    { id: 'repair-vault', label: 'Repair Notebook', group: 'Settings', keywords: ['repair', 'fix', 'restore', 'config', 'agents', 'themes', 'missing', 'reset', 'flatten', 'structure', 'vault'], enabled: !!onRepairVault, execute: () => onRepairVault?.() },
  ]
}

export function buildSettingsCommands(config: SettingsCommandsConfig): CommandAction[] {
  const {
    mcpStatus, vaultCount, isGettingStartedHidden,
    onOpenSettings, onOpenFeedback, onOpenVault, onCreateEmptyVault, onRemoveActiveVault, onRestoreGettingStarted,
    onCheckForUpdates, onInstallMcp, onReloadVault, onRepairVault, onRevealVaultInFinder,
    locale = 'en', systemLocale = locale, selectedUiLanguage = SYSTEM_UI_LANGUAGE, onSetUiLanguage,
  } = config

  return [
    ...buildPrimarySettingsCommands({ locale, onOpenSettings, onOpenFeedback, onCheckForUpdates }),
    ...buildLanguageCommands({
      locale,
      systemLocale,
      selectedUiLanguage,
      onOpenSettings,
      onSetUiLanguage,
    }),
    ...buildVaultSettingsCommands({
      vaultCount,
      isGettingStartedHidden,
      onOpenVault,
      onCreateEmptyVault,
      onRemoveActiveVault,
      onRestoreGettingStarted,
      onRevealVaultInFinder,
    }),
    ...buildMaintenanceCommands({ mcpStatus, onInstallMcp, onReloadVault, onRepairVault }),
  ]
}
