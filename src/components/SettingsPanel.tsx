import { useState, useRef, useCallback, useEffect, useMemo, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { X } from '@phosphor-icons/react'
import {
  createMissingAiAgentsStatus,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import {
  createTranslator,
  resolveEffectiveLocale,
  type AppLocale,
} from '../lib/i18n'
import { resolveEditorFont, resolveNativeShellMaterial, resolveThemePreset } from '../lib/appearance'
import {
  DEFAULT_TRANSCRIPTION_PROVIDER,
  isCloudTranscriptionProvider,
  type TranscriptionProviderId,
} from '../lib/transcriptionProviders'
import type { Settings, VaultEntry } from '../types'
import { useVaultPortabilityActions } from '../hooks/useVaultPortabilityActions'
import { Button } from './ui/button'
import { SettingsBody } from './settings/SettingsBody'
import {
  buildSettingsFromDraft,
  createSettingsDraft,
  resolveSettingsDraftThemeMode,
  trackTelemetryConsentChange,
} from './settings/settingsDraft'
import type { SettingsDraft } from './settings/settingsTypes'
import { useSettingsAppearancePreview } from './useSettingsAppearancePreview'

interface SettingsPanelProps {
  open: boolean
  settings: Settings
  aiAgentsStatus?: AiAgentsStatus
  locale?: AppLocale
  systemLocale?: AppLocale
  vaultPath?: string
  entries?: VaultEntry[]
  reloadVault?: () => Promise<unknown>
  reloadFolders?: () => Promise<unknown>
  loadModifiedFiles?: () => Promise<unknown>
  setToastMessage?: (message: string) => void
  onSave: (settings: Settings) => void
  isGitVault?: boolean
  hasGitMetadata?: boolean
  gitCapabilityUpdating?: boolean
  onSetGitEnabled?: (enabled: boolean) => void
  explicitOrganizationEnabled?: boolean
  onSaveExplicitOrganization?: (enabled: boolean) => void
  onClose: () => void
}

type SettingsPanelInnerProps = Omit<SettingsPanelProps, 'open' | 'explicitOrganizationEnabled' | 'aiAgentsStatus' | 'isGitVault' | 'hasGitMetadata' | 'gitCapabilityUpdating'> & {
  aiAgentsStatus: AiAgentsStatus
  locale: AppLocale
  systemLocale: AppLocale
  isGitVault: boolean
  hasGitMetadata: boolean
  gitCapabilityUpdating: boolean
  explicitOrganizationEnabled: boolean
}

const noopAsync = () => Promise.resolve()
const noopToast = () => {}

function isSaveShortcut(event: ReactKeyboardEvent): boolean {
  return event.key === 'Enter' && (event.metaKey || event.ctrlKey)
}

/** Modal surface for application, vault, Git, and appearance settings. */
export function SettingsPanel({
  open,
  settings,
  aiAgentsStatus = createMissingAiAgentsStatus(),
  locale = 'en',
  systemLocale = locale,
  vaultPath = '',
  entries = [],
  reloadVault = noopAsync,
  reloadFolders = noopAsync,
  loadModifiedFiles = noopAsync,
  setToastMessage = noopToast,
  onSave,
  isGitVault = true,
  hasGitMetadata = isGitVault,
  gitCapabilityUpdating = false,
  onSetGitEnabled,
  explicitOrganizationEnabled = true,
  onSaveExplicitOrganization,
  onClose,
}: SettingsPanelProps) {
  if (!open) return null

  return (
    <SettingsPanelInner
      settings={settings}
      aiAgentsStatus={aiAgentsStatus}
      locale={locale}
      systemLocale={systemLocale}
      vaultPath={vaultPath}
      entries={entries}
      reloadVault={reloadVault}
      reloadFolders={reloadFolders}
      loadModifiedFiles={loadModifiedFiles}
      setToastMessage={setToastMessage}
      onSave={onSave}
      isGitVault={isGitVault}
      hasGitMetadata={hasGitMetadata}
      gitCapabilityUpdating={gitCapabilityUpdating}
      onSetGitEnabled={onSetGitEnabled}
      explicitOrganizationEnabled={explicitOrganizationEnabled}
      onSaveExplicitOrganization={onSaveExplicitOrganization}
      onClose={onClose}
    />
  )
}

function SettingsPanelInner({
  settings,
  aiAgentsStatus,
  systemLocale,
  vaultPath = '',
  entries = [],
  reloadVault = noopAsync,
  reloadFolders = noopAsync,
  loadModifiedFiles = noopAsync,
  setToastMessage = noopToast,
  onSave,
  isGitVault,
  hasGitMetadata,
  gitCapabilityUpdating,
  onSetGitEnabled,
  explicitOrganizationEnabled,
  onSaveExplicitOrganization,
  onClose,
}: SettingsPanelInnerProps) {
  const [draft, setDraft] = useState(() => createSettingsDraft(settings, explicitOrganizationEnabled))
  const panelRef = useRef<HTMLDivElement>(null)
  const draftLocale = resolveEffectiveLocale(draft.uiLanguage, [systemLocale])
  const t = createTranslator(draftLocale)
  const savedAppearance = useMemo(() => ({
    themeMode: resolveSettingsDraftThemeMode(settings.theme_mode),
    themePreset: resolveThemePreset(settings.theme_preset),
    editorFont: resolveEditorFont(settings.editor_font),
    nativeShellMaterial: resolveNativeShellMaterial(settings.native_shell_material),
  }), [settings.editor_font, settings.native_shell_material, settings.theme_mode, settings.theme_preset])
  const { commitAppearancePreview } = useSettingsAppearancePreview({
    draft: {
      themeMode: draft.themeMode,
      themePreset: draft.themePreset,
      editorFont: draft.editorFont,
      nativeShellMaterial: draft.nativeShellMaterial,
    },
    saved: savedAppearance,
  })
  const portabilityActions = useVaultPortabilityActions({
    resolvedPath: vaultPath,
    reloadVault,
    reloadFolders,
    loadModifiedFiles,
    setToastMessage,
  })

  useEffect(() => {
    setDraft(createSettingsDraft(settings, explicitOrganizationEnabled))
  }, [explicitOrganizationEnabled, settings])

  useEffect(() => {
    const timer = setTimeout(() => {
      const focusTarget = panelRef.current?.querySelector<HTMLElement>('[data-settings-autofocus="true"]')
      focusTarget?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const updateDraft = useCallback(
    <Key extends keyof SettingsDraft>(key: Key, value: SettingsDraft[Key]) => {
      setDraft((current) => ({ ...current, [key]: value }))
    },
    [],
  )
  const updateTranscriptionProvider = useCallback((provider: TranscriptionProviderId) => {
    setDraft((current) => {
      const requiresCloud = isCloudTranscriptionProvider(provider)
      if (requiresCloud && !current.cloudTranscriptionEnabled) return current
      return { ...current, transcriptionProvider: provider }
    })
  }, [])
  const updateCloudTranscriptionEnabled = useCallback((enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      cloudTranscriptionEnabled: enabled,
      transcriptionProvider: enabled ? current.transcriptionProvider : DEFAULT_TRANSCRIPTION_PROVIDER,
    }))
  }, [])

  const handleSave = useCallback(() => {
    commitAppearancePreview()
    trackTelemetryConsentChange(settings.analytics_enabled === true, draft.analytics)
    onSave(buildSettingsFromDraft(settings, draft))
    onSaveExplicitOrganization?.(draft.explicitOrganization)
    onClose()
  }, [commitAppearancePreview, draft, onClose, onSave, onSaveExplicitOrganization, settings])

  const handleBackdropClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose()
    },
    [onClose],
  )

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }

      if (isSaveShortcut(event)) {
        event.preventDefault()
        handleSave()
      }
    },
    [handleSave, onClose],
  )

  return (
    <div
      className="grimoire-dialog-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="settings-panel"
    >
      <div
        ref={panelRef}
        className="settings-panel-shell grimoire-settings-stage flex max-h-[86vh] w-[min(940px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)]"
      >
        <SettingsHeader onClose={onClose} t={t} />
        <SettingsBody
          t={t}
          locale={draftLocale}
          systemLocale={systemLocale}
          pullInterval={draft.pullInterval}
          setPullInterval={(value) => updateDraft('pullInterval', value)}
          isGitVault={isGitVault}
          hasGitMetadata={hasGitMetadata}
          gitCapabilityUpdating={gitCapabilityUpdating}
          onSetGitEnabled={onSetGitEnabled}
          autoGitEnabled={draft.autoGitEnabled}
          setAutoGitEnabled={(value) => updateDraft('autoGitEnabled', value)}
          autoGitIdleThresholdSeconds={draft.autoGitIdleThresholdSeconds}
          setAutoGitIdleThresholdSeconds={(value) => updateDraft('autoGitIdleThresholdSeconds', value)}
          autoGitInactiveThresholdSeconds={draft.autoGitInactiveThresholdSeconds}
          setAutoGitInactiveThresholdSeconds={(value) => updateDraft('autoGitInactiveThresholdSeconds', value)}
          autoAdvanceInboxAfterOrganize={draft.autoAdvanceInboxAfterOrganize}
          setAutoAdvanceInboxAfterOrganize={(value) => updateDraft('autoAdvanceInboxAfterOrganize', value)}
          aiAgentsStatus={aiAgentsStatus}
          defaultAiAgent={draft.defaultAiAgent}
          setDefaultAiAgent={(value) => updateDraft('defaultAiAgent', value)}
          aiAgentModels={draft.aiAgentModels}
          setAiAgentModels={(value) => updateDraft('aiAgentModels', value)}
          aiAgentProviders={draft.aiAgentProviders}
          setAiAgentProviders={(value) => updateDraft('aiAgentProviders', value)}
          vaultPath={vaultPath}
          entries={entries}
          importMarkdownFolderBusy={portabilityActions.markdownImportBusy}
          portabilityBusyAction={portabilityActions.portabilityBusyAction}
          portabilityProgress={portabilityActions.portabilityProgress}
          importPreview={portabilityActions.lastImportPreview}
          onCancelPortabilityAction={portabilityActions.handleCancelPortabilityAction}
          onPreviewMarkdownFolder={portabilityActions.handlePreviewMarkdownFolder}
          onImportMarkdownFolder={portabilityActions.handleImportMarkdownFolder}
          onPreviewMarkdownZip={portabilityActions.handlePreviewMarkdownZip}
          onImportMarkdownZip={portabilityActions.handleImportMarkdownZip}
          onPreviewBear={portabilityActions.handlePreviewBear}
          onImportBear={portabilityActions.handleImportBear}
          onPreviewObsidian={portabilityActions.handlePreviewObsidian}
          onImportObsidian={portabilityActions.handleImportObsidian}
          onPreviewNotion={portabilityActions.handlePreviewNotion}
          onImportNotion={portabilityActions.handleImportNotion}
          onPreviewNotionFolder={portabilityActions.handlePreviewNotionFolder}
          onImportNotionFolder={portabilityActions.handleImportNotionFolder}
          onPreviewSpanda={portabilityActions.handlePreviewSpanda}
          onImportSpanda={portabilityActions.handleImportSpanda}
          onPreviewAppleJournal={portabilityActions.handlePreviewAppleJournal}
          onImportAppleJournal={portabilityActions.handleImportAppleJournal}
          onPreviewDayOne={portabilityActions.handlePreviewDayOne}
          onImportDayOne={portabilityActions.handleImportDayOne}
          onPreviewJourney={portabilityActions.handlePreviewJourney}
          onImportJourney={portabilityActions.handleImportJourney}
          onExportMarkdownZip={portabilityActions.handleExportMarkdownZip}
          onExportStaticHtmlArchive={portabilityActions.handleExportStaticHtmlArchive}
          onPreviewJsonSnapshot={portabilityActions.handlePreviewJsonSnapshot}
          onExportJsonSnapshot={portabilityActions.handleExportJsonSnapshot}
          onPreviewSqliteSnapshot={portabilityActions.handlePreviewSqliteSnapshot}
          onExportSqliteSnapshot={portabilityActions.handleExportSqliteSnapshot}
          s3MirrorPreviewReady={portabilityActions.s3MirrorPreviewReady}
          s3MirrorPullPreviewReady={portabilityActions.s3MirrorPullPreviewReady}
          s3ProviderPushPreviewReady={portabilityActions.s3ProviderPushPreviewReady}
          s3ProviderPullPreviewReady={portabilityActions.s3ProviderPullPreviewReady}
          azureProviderPushPreviewReady={portabilityActions.azureProviderPushPreviewReady}
          azureProviderPullPreviewReady={portabilityActions.azureProviderPullPreviewReady}
          azureMirrorPreviewReady={portabilityActions.azureMirrorPreviewReady}
          azureMirrorPullPreviewReady={portabilityActions.azureMirrorPullPreviewReady}
          s3MirrorPreviewReport={portabilityActions.s3MirrorPreviewReport}
          s3MirrorPullPreviewReport={portabilityActions.s3MirrorPullPreviewReport}
          s3ProviderPushPreviewReport={portabilityActions.s3ProviderPushPreviewReport}
          s3ProviderPullPreviewReport={portabilityActions.s3ProviderPullPreviewReport}
          azureProviderPushPreviewReport={portabilityActions.azureProviderPushPreviewReport}
          azureProviderPullPreviewReport={portabilityActions.azureProviderPullPreviewReport}
          azureMirrorPreviewReport={portabilityActions.azureMirrorPreviewReport}
          azureMirrorPullPreviewReport={portabilityActions.azureMirrorPullPreviewReport}
          s3LivePreflightReport={portabilityActions.s3LivePreflightReport}
          azureLivePreflightReport={portabilityActions.azureLivePreflightReport}
          onRunS3LivePreflight={portabilityActions.handleS3LivePreflight}
          onRunAzureLivePreflight={portabilityActions.handleAzureLivePreflight}
          onPreviewS3MirrorPush={portabilityActions.handlePreviewS3MirrorPush}
          onApplyS3MirrorPush={portabilityActions.handleApplyS3MirrorPush}
          onPreviewS3MirrorPull={portabilityActions.handlePreviewS3MirrorPull}
          onApplyS3MirrorPull={portabilityActions.handleApplyS3MirrorPull}
          onPreviewS3ProviderPush={portabilityActions.handlePreviewS3ProviderPush}
          onApplyS3ProviderPush={portabilityActions.handleApplyS3ProviderPush}
          onPreviewS3ProviderPull={portabilityActions.handlePreviewS3ProviderPull}
          onApplyS3ProviderPull={portabilityActions.handleApplyS3ProviderPull}
          onPreviewAzureProviderPush={portabilityActions.handlePreviewAzureProviderPush}
          onApplyAzureProviderPush={portabilityActions.handleApplyAzureProviderPush}
          onPreviewAzureProviderPull={portabilityActions.handlePreviewAzureProviderPull}
          onApplyAzureProviderPull={portabilityActions.handleApplyAzureProviderPull}
          onPreviewAzureMirrorPush={portabilityActions.handlePreviewAzureMirrorPush}
          onApplyAzureMirrorPush={portabilityActions.handleApplyAzureMirrorPush}
          onPreviewAzureMirrorPull={portabilityActions.handlePreviewAzureMirrorPull}
          onApplyAzureMirrorPull={portabilityActions.handleApplyAzureMirrorPull}
          releaseChannel={draft.releaseChannel}
          setReleaseChannel={(value) => updateDraft('releaseChannel', value)}
          themeMode={draft.themeMode}
          setThemeMode={(value) => updateDraft('themeMode', value)}
          themePreset={draft.themePreset}
          setThemePreset={(value) => updateDraft('themePreset', value)}
          editorFont={draft.editorFont}
          setEditorFont={(value) => updateDraft('editorFont', value)}
          uiLanguage={draft.uiLanguage}
          setUiLanguage={(value) => updateDraft('uiLanguage', value)}
          menuBarIconEnabled={draft.menuBarIconEnabled}
          setMenuBarIconEnabled={(value) => updateDraft('menuBarIconEnabled', value)}
          nativeShellMaterial={draft.nativeShellMaterial}
          setNativeShellMaterial={(value) => updateDraft('nativeShellMaterial', value)}
          initialH1AutoRename={draft.initialH1AutoRename}
          setInitialH1AutoRename={(value) => updateDraft('initialH1AutoRename', value)}
          explicitOrganization={draft.explicitOrganization}
          setExplicitOrganization={(value) => updateDraft('explicitOrganization', value)}
          crashReporting={draft.crashReporting}
          setCrashReporting={(value) => updateDraft('crashReporting', value)}
          analytics={draft.analytics}
          setAnalytics={(value) => updateDraft('analytics', value)}
          transcriptionProvider={draft.transcriptionProvider}
          setTranscriptionProvider={updateTranscriptionProvider}
          cloudTranscriptionEnabled={draft.cloudTranscriptionEnabled}
          setCloudTranscriptionEnabled={updateCloudTranscriptionEnabled}
        />
        <SettingsFooter onClose={onClose} onSave={handleSave} t={t} />
      </div>
    </div>
  )
}

function SettingsHeader({ onClose, t }: { onClose: () => void; t: ReturnType<typeof createTranslator> }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-6">
      <span className="text-base font-semibold text-foreground">{t('settings.title')}</span>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        title={t('settings.close')}
        aria-label={t('settings.close')}
      >
        <X size={16} />
      </Button>
    </div>
  )
}

function SettingsFooter({ onClose, onSave, t }: { onClose: () => void; onSave: () => void; t: ReturnType<typeof createTranslator> }) {
  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-t border-border px-6">
      <span className="text-[11px] text-muted-foreground">{t('settings.footerShortcut')}</span>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('settings.cancel')}
        </Button>
        <Button onClick={onSave} data-testid="settings-save">
          {t('settings.save')}
        </Button>
      </div>
    </div>
  )
}
