import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react'
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
import { resolveEditorFont, resolveThemePreset } from '../lib/appearance'
import type { Settings } from '../types'
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
  importMarkdownFolderBusy?: boolean
  onImportMarkdownFolder?: () => void
  onImportMarkdownZip?: () => void
  onImportBear?: () => void
  onImportDayOne?: () => void
  onImportJourney?: () => void
  onExportMarkdownZip?: () => void
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
  importMarkdownFolderBusy = false,
  onImportMarkdownFolder,
  onImportMarkdownZip,
  onImportBear,
  onImportDayOne,
  onImportJourney,
  onExportMarkdownZip,
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
      importMarkdownFolderBusy={importMarkdownFolderBusy}
      onImportMarkdownFolder={onImportMarkdownFolder}
      onImportMarkdownZip={onImportMarkdownZip}
      onImportBear={onImportBear}
      onImportDayOne={onImportDayOne}
      onImportJourney={onImportJourney}
      onExportMarkdownZip={onExportMarkdownZip}
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
  importMarkdownFolderBusy = false,
  onImportMarkdownFolder,
  onImportMarkdownZip,
  onImportBear,
  onImportDayOne,
  onImportJourney,
  onExportMarkdownZip,
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
  }), [settings.editor_font, settings.theme_mode, settings.theme_preset])
  const { commitAppearancePreview } = useSettingsAppearancePreview({
    draft: {
      themeMode: draft.themeMode,
      themePreset: draft.themePreset,
      editorFont: draft.editorFont,
    },
    saved: savedAppearance,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--shadow-overlay)' }}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      data-testid="settings-panel"
    >
      <div
        ref={panelRef}
        className="settings-panel-shell flex max-h-[86vh] w-[min(940px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-[0_18px_55px_var(--shadow-dialog)]"
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
          importMarkdownFolderBusy={importMarkdownFolderBusy}
          onImportMarkdownFolder={onImportMarkdownFolder}
          onImportMarkdownZip={onImportMarkdownZip}
          onImportBear={onImportBear}
          onImportDayOne={onImportDayOne}
          onImportJourney={onImportJourney}
          onExportMarkdownZip={onExportMarkdownZip}
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
          initialH1AutoRename={draft.initialH1AutoRename}
          setInitialH1AutoRename={(value) => updateDraft('initialH1AutoRename', value)}
          explicitOrganization={draft.explicitOrganization}
          setExplicitOrganization={(value) => updateDraft('explicitOrganization', value)}
          crashReporting={draft.crashReporting}
          setCrashReporting={(value) => updateDraft('crashReporting', value)}
          analytics={draft.analytics}
          setAnalytics={(value) => updateDraft('analytics', value)}
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
