import { useCallback, useRef, useState } from 'react'
import { AppearanceSettingsSection } from '../AppearanceSettingsSection'
import { NativeSettingsSection } from '../NativeSettingsSection'
import { PortabilitySettingsSection } from '../PortabilitySettingsSection'
import { SettingsSection } from './SettingsControls'
import { AiAgentSettingsSection } from './AiAgentSettingsSection'
import { LanguageSettingsSection } from './LanguageSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import {
  SettingsMobileNavigation,
  SettingsNavigation,
} from './SettingsNavigation'
import { resolveActiveSettingsSection } from './SettingsNavigationModel'
import { SyncAndGitSettingsSection } from './SyncAndGitSettingsSection'
import { WorkflowSettingsSection } from './WorkflowSettingsSection'
import type { SettingsBodyProps } from './settingsTypes'

/** Renders the redesigned two-pane Settings body. */
export function SettingsBody(props: SettingsBodyProps) {
  const {
    t,
    locale,
    systemLocale,
    vaultPath,
    importMarkdownFolderBusy,
    portabilityBusyAction,
    portabilityProgress,
    importPreview,
    exportPreview,
    onCancelPortabilityAction,
    onPreviewMarkdownFolder,
    onImportMarkdownFolder,
    onPreviewMarkdownZip,
    onImportMarkdownZip,
    onPreviewBear,
    onImportBear,
    onPreviewObsidian,
    onImportObsidian,
    onPreviewNotion,
    onImportNotion,
    onPreviewNotionFolder,
    onImportNotionFolder,
    onPreviewSpanda,
    onImportSpanda,
    onPreviewAppleJournal,
    onImportAppleJournal,
    onPreviewDayOne,
    onImportDayOne,
    onPreviewJourney,
    onImportJourney,
    onPreviewJsonCapsule,
    onImportJsonCapsule,
    onPreviewSqliteCapsule,
    onImportSqliteCapsule,
    onExportMarkdownZip,
    onExportStaticHtmlArchive,
    onPreviewJsonSnapshot,
    onExportJsonSnapshot,
    onPreviewSqliteSnapshot,
    onExportSqliteSnapshot,
    s3MirrorPreviewReady,
    s3MirrorPullPreviewReady,
    s3ProviderPushPreviewReady,
    s3ProviderPullPreviewReady,
    azureProviderPushPreviewReady,
    azureProviderPullPreviewReady,
    azureMirrorPreviewReady,
    azureMirrorPullPreviewReady,
    s3MirrorPreviewReport,
    s3MirrorPullPreviewReport,
    s3ProviderPushPreviewReport,
    s3ProviderPullPreviewReport,
    s3ProviderPushPreviewArgs,
    s3ProviderPullPreviewArgs,
    azureProviderPushPreviewReport,
    azureProviderPullPreviewReport,
    azureProviderPushPreviewArgs,
    azureProviderPullPreviewArgs,
    azureMirrorPreviewReport,
    azureMirrorPullPreviewReport,
    s3LivePreflightReport,
    azureLivePreflightReport,
    onRunS3LivePreflight,
    onRunAzureLivePreflight,
    onPreviewS3MirrorPush,
    onApplyS3MirrorPush,
    onPreviewS3MirrorPull,
    onApplyS3MirrorPull,
    onPreviewS3ProviderPush,
    onApplyS3ProviderPush,
    onPreviewS3ProviderPull,
    onApplyS3ProviderPull,
    onPreviewAzureProviderPush,
    onApplyAzureProviderPush,
    onPreviewAzureProviderPull,
    onApplyAzureProviderPull,
    onPreviewAzureMirrorPush,
    onApplyAzureMirrorPush,
    onPreviewAzureMirrorPull,
    onApplyAzureMirrorPull,
  } = props
  const entries = props.entries
  const [activeSectionId, setActiveSectionId] = useState('settings-portability')
  const mainSurfaceRef = useRef<HTMLDivElement>(null)
  const handleMainSurfaceScroll = useCallback(() => {
    const nextSectionId = resolveActiveSettingsSection(mainSurfaceRef.current)
    if (!nextSectionId) return
    setActiveSectionId((current) => current === nextSectionId ? current : nextSectionId)
  }, [])

  return (
    <div className="flex min-h-0 flex-1">
      <SettingsNavigation
        t={t}
        vaultPath={vaultPath}
        isGitVault={props.isGitVault}
        activeSectionId={activeSectionId}
        onSectionChange={setActiveSectionId}
      />
      <div
        ref={mainSurfaceRef}
        className="settings-main-surface min-w-0 flex-1 overflow-auto px-4 py-3 md:px-6"
        data-testid="settings-main-surface"
        onScroll={handleMainSurfaceScroll}
      >
        <SettingsMobileNavigation
          t={t}
          activeSectionId={activeSectionId}
          onSectionChange={setActiveSectionId}
        />
        <div className="settings-content-stack mx-auto flex max-w-[860px] flex-col pb-5">
          <SettingsSection id="settings-portability" showDivider={false}>
            <PortabilitySettingsSection
              t={t}
              vaultPath={vaultPath}
              entries={entries}
              vaultReady={vaultPath.trim().length > 0}
              importBusy={importMarkdownFolderBusy}
              busyAction={portabilityBusyAction}
              progress={portabilityProgress}
              importPreview={importPreview}
              exportPreview={exportPreview}
              onCancelProgress={onCancelPortabilityAction}
              onPreviewMarkdownFolder={onPreviewMarkdownFolder}
              onImportMarkdownFolder={onImportMarkdownFolder}
              onPreviewMarkdownZip={onPreviewMarkdownZip}
              onImportMarkdownZip={onImportMarkdownZip}
              onPreviewBear={onPreviewBear}
              onImportBear={onImportBear}
              onPreviewObsidian={onPreviewObsidian}
              onImportObsidian={onImportObsidian}
              onPreviewNotion={onPreviewNotion}
              onImportNotion={onImportNotion}
              onPreviewNotionFolder={onPreviewNotionFolder}
              onImportNotionFolder={onImportNotionFolder}
              onPreviewSpanda={onPreviewSpanda}
              onImportSpanda={onImportSpanda}
              onPreviewAppleJournal={onPreviewAppleJournal}
              onImportAppleJournal={onImportAppleJournal}
              onPreviewDayOne={onPreviewDayOne}
              onImportDayOne={onImportDayOne}
              onPreviewJourney={onPreviewJourney}
              onImportJourney={onImportJourney}
              onPreviewJsonCapsule={onPreviewJsonCapsule}
              onImportJsonCapsule={onImportJsonCapsule}
              onPreviewSqliteCapsule={onPreviewSqliteCapsule}
              onImportSqliteCapsule={onImportSqliteCapsule}
              onExportMarkdownZip={onExportMarkdownZip}
              onExportStaticHtmlArchive={onExportStaticHtmlArchive}
              onPreviewJsonSnapshot={onPreviewJsonSnapshot}
              onExportJsonSnapshot={onExportJsonSnapshot}
              onPreviewSqliteSnapshot={onPreviewSqliteSnapshot}
              onExportSqliteSnapshot={onExportSqliteSnapshot}
              s3MirrorPreviewReady={s3MirrorPreviewReady}
              s3MirrorPullPreviewReady={s3MirrorPullPreviewReady}
              s3ProviderPushPreviewReady={s3ProviderPushPreviewReady}
              s3ProviderPullPreviewReady={s3ProviderPullPreviewReady}
              azureProviderPushPreviewReady={azureProviderPushPreviewReady}
              azureProviderPullPreviewReady={azureProviderPullPreviewReady}
              azureMirrorPreviewReady={azureMirrorPreviewReady}
              azureMirrorPullPreviewReady={azureMirrorPullPreviewReady}
              s3MirrorPreviewReport={s3MirrorPreviewReport}
              s3MirrorPullPreviewReport={s3MirrorPullPreviewReport}
              s3ProviderPushPreviewReport={s3ProviderPushPreviewReport}
              s3ProviderPullPreviewReport={s3ProviderPullPreviewReport}
              s3ProviderPushPreviewArgs={s3ProviderPushPreviewArgs}
              s3ProviderPullPreviewArgs={s3ProviderPullPreviewArgs}
              azureProviderPushPreviewReport={azureProviderPushPreviewReport}
              azureProviderPullPreviewReport={azureProviderPullPreviewReport}
              azureProviderPushPreviewArgs={azureProviderPushPreviewArgs}
              azureProviderPullPreviewArgs={azureProviderPullPreviewArgs}
              azureMirrorPreviewReport={azureMirrorPreviewReport}
              azureMirrorPullPreviewReport={azureMirrorPullPreviewReport}
              s3LivePreflightReport={s3LivePreflightReport}
              azureLivePreflightReport={azureLivePreflightReport}
              onRunS3LivePreflight={onRunS3LivePreflight}
              onRunAzureLivePreflight={onRunAzureLivePreflight}
              onPreviewS3MirrorPush={onPreviewS3MirrorPush}
              onApplyS3MirrorPush={onApplyS3MirrorPush}
              onPreviewS3MirrorPull={onPreviewS3MirrorPull}
              onApplyS3MirrorPull={onApplyS3MirrorPull}
              onPreviewS3ProviderPush={onPreviewS3ProviderPush}
              onApplyS3ProviderPush={onApplyS3ProviderPush}
              onPreviewS3ProviderPull={onPreviewS3ProviderPull}
              onApplyS3ProviderPull={onApplyS3ProviderPull}
              onPreviewAzureProviderPush={onPreviewAzureProviderPush}
              onApplyAzureProviderPush={onApplyAzureProviderPush}
              onPreviewAzureProviderPull={onPreviewAzureProviderPull}
              onApplyAzureProviderPull={onApplyAzureProviderPull}
              onPreviewAzureMirrorPush={onPreviewAzureMirrorPush}
              onApplyAzureMirrorPush={onApplyAzureMirrorPush}
              onPreviewAzureMirrorPull={onPreviewAzureMirrorPull}
              onApplyAzureMirrorPull={onApplyAzureMirrorPull}
            />
          </SettingsSection>

          <SettingsSection id="settings-sync">
            <SyncAndGitSettingsSection {...props} />
          </SettingsSection>

          <SettingsSection id="settings-appearance">
            <AppearanceSettingsSection {...props} />
          </SettingsSection>

          <SettingsSection id="settings-workflow">
            <WorkflowSettingsSection {...props} />
          </SettingsSection>

          <SettingsSection id="settings-agents">
            <AiAgentSettingsSection {...props} />
          </SettingsSection>

          <SettingsSection id="settings-language">
            <LanguageSettingsSection
              t={t}
              locale={locale}
              systemLocale={systemLocale}
              uiLanguage={props.uiLanguage}
              setUiLanguage={props.setUiLanguage}
            />
          </SettingsSection>

          <SettingsSection id="settings-native">
            <NativeSettingsSection
              t={t}
              menuBarIconEnabled={props.menuBarIconEnabled}
              setMenuBarIconEnabled={props.setMenuBarIconEnabled}
              nativeShellMaterial={props.nativeShellMaterial}
              setNativeShellMaterial={props.setNativeShellMaterial}
            />
          </SettingsSection>

          <SettingsSection id="settings-privacy">
            <PrivacySettingsSection {...props} />
          </SettingsSection>
        </div>
      </div>
    </div>
  )
}
