import { Cloud, DownloadSimple, FolderOpen, UploadSimple } from '@phosphor-icons/react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import { AppImportAutopsyActions } from './AppImportAutopsyActions'
import { JournalImportAutopsyActions } from './JournalImportAutopsyActions'
import { ObjectStoragePrototypeActions } from './ObjectStoragePrototypeActions'
import type { PortabilityActionDeckProps } from './PortabilityActionDeck.types'
import { PortabilityExportActions } from './PortabilityExportActions'
import { PortabilityImportButton } from './PortabilityActionButton'
import { PortabilityActionProgress } from './PortabilityActionProgress'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>
type PortabilityActionLane = 'markdown' | 'apps' | 'journals' | 'export' | 'storage'

interface LaneConfig { id: PortabilityActionLane; label: string; description: string; icon: ReactNode }

/** Shows import/export/storage actions one lane at a time so Settings stays inspectable. */
export function PortabilityActionDeck({
  t,
  vaultReady,
  busyAction,
  progress,
  onCancelProgress,
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
  azureProviderPushPreviewReport,
  azureProviderPullPreviewReport,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  s3LivePreflightReport,
  azureLivePreflightReport,
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
  onExportMarkdownZip,
  onExportStaticHtmlArchive,
  onPreviewJsonSnapshot,
  onExportJsonSnapshot,
  onPreviewSqliteSnapshot,
  onExportSqliteSnapshot,
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
}: PortabilityActionDeckProps) {
  const previewLane = s3LivePreflightReport || azureLivePreflightReport || s3MirrorPreviewReport || s3MirrorPullPreviewReport || s3ProviderPushPreviewReport || s3ProviderPullPreviewReport || azureProviderPushPreviewReport || azureProviderPullPreviewReport || azureMirrorPreviewReport || azureMirrorPullPreviewReport
    ? 'storage'
    : 'markdown'
  const [activeLane, setActiveLane] = useState<PortabilityActionLane>(previewLane)

  useEffect(() => {
    const busyLane = laneForAction(busyAction)
    if (busyLane) setActiveLane(busyLane)
  }, [busyAction])

  useEffect(() => {
    if (s3LivePreflightReport || azureLivePreflightReport || s3MirrorPreviewReport || s3MirrorPullPreviewReport || s3ProviderPushPreviewReport || s3ProviderPullPreviewReport || azureProviderPushPreviewReport || azureProviderPullPreviewReport || azureMirrorPreviewReport || azureMirrorPullPreviewReport) {
      setActiveLane('storage')
    }
  }, [azureLivePreflightReport, azureMirrorPreviewReport, azureMirrorPullPreviewReport, azureProviderPullPreviewReport, azureProviderPushPreviewReport, s3LivePreflightReport, s3MirrorPreviewReport, s3MirrorPullPreviewReport, s3ProviderPullPreviewReport, s3ProviderPushPreviewReport])

  const lanes = useMemo(() => buildLanes(t), [t])
  const activeConfig = lanes.find((lane) => lane.id === activeLane) ?? lanes[0]

  return (
    <section
      className="grimoire-portability-action-deck grid gap-3 rounded-md border border-border bg-background/55 p-3"
      data-testid="settings-portability-action-deck"
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-foreground">{t('settings.portability.actionDeckTitle')}</div>
        <div className="max-w-[560px] text-[11px] leading-snug text-muted-foreground">
          {t('settings.portability.actionDeckDescription')}
        </div>
      </div>

      <div className="grimoire-portability-lanes flex flex-wrap gap-1 rounded-md border border-border bg-muted/30 p-1" role="tablist">
        {lanes.map((lane) => (
          <Button
            key={lane.id}
            type="button"
            variant={activeLane === lane.id ? 'secondary' : 'ghost'}
            size="sm"
            role="tab"
            aria-selected={activeLane === lane.id}
            data-testid={`settings-portability-lane-${lane.id}`}
            className="h-8 gap-1.5 px-2 text-xs"
            onClick={() => setActiveLane(lane.id)}
          >
            {lane.icon}
            {lane.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-2" role="tabpanel" aria-label={activeConfig.label}>
        <div className="text-[11px] leading-snug text-muted-foreground">{activeConfig.description}</div>
        {progress ? (
          <PortabilityActionProgress progress={progress} onCancel={onCancelProgress} t={t} />
        ) : null}
        <div className={activeLane === 'storage' ? 'grid gap-2' : 'flex flex-wrap gap-2'}>
          {renderLaneActions(activeLane)}
        </div>
      </div>
    </section>
  )

  function renderLaneActions(lane: PortabilityActionLane): ReactNode {
    if (lane === 'markdown') return renderMarkdownActions()
    if (lane === 'apps') {
      return (
        <AppImportAutopsyActions
          t={t}
          vaultReady={vaultReady}
          busyAction={busyAction}
          onPreviewObsidian={onPreviewObsidian}
          onImportObsidian={onImportObsidian}
          onPreviewNotion={onPreviewNotion}
          onImportNotion={onImportNotion}
          onPreviewNotionFolder={onPreviewNotionFolder}
          onImportNotionFolder={onImportNotionFolder}
          onPreviewSpanda={onPreviewSpanda}
          onImportSpanda={onImportSpanda}
        />
      )
    }
    if (lane === 'journals') {
      return (
        <JournalImportAutopsyActions
          t={t}
          vaultReady={vaultReady}
          busyAction={busyAction}
          onPreviewAppleJournal={onPreviewAppleJournal}
          onImportAppleJournal={onImportAppleJournal}
          onPreviewDayOne={onPreviewDayOne}
          onImportDayOne={onImportDayOne}
          onPreviewJourney={onPreviewJourney}
          onImportJourney={onImportJourney}
        />
      )
    }
    if (lane === 'export') return renderExportActions()
    return (
      <ObjectStoragePrototypeActions
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
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
        azureProviderPushPreviewReport={azureProviderPushPreviewReport}
        azureProviderPullPreviewReport={azureProviderPullPreviewReport}
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
    )
  }

  function renderMarkdownActions(): ReactNode {
    const previewing = t('settings.portability.previewing')
    return (
      <>
        <PortabilityImportButton
          label={t('settings.portability.previewMarkdownFolder')}
          testId="settings-preview-markdown-folder"
          busy={busyAction === 'markdown-folder-preview'}
          busyLabel={previewing}
          disabled={buttonDisabled(busyAction, vaultReady, onPreviewMarkdownFolder)}
          onClick={onPreviewMarkdownFolder}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importMarkdownFolder')}
          testId="settings-import-markdown-folder"
          busy={busyAction === 'markdown-folder'}
          disabled={buttonDisabled(busyAction, vaultReady, onImportMarkdownFolder)}
          onClick={onImportMarkdownFolder}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.previewMarkdownZip')}
          testId="settings-preview-markdown-zip"
          busy={busyAction === 'markdown-zip-preview'}
          busyLabel={previewing}
          disabled={buttonDisabled(busyAction, vaultReady, onPreviewMarkdownZip)}
          onClick={onPreviewMarkdownZip}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importMarkdownZip')}
          testId="settings-import-markdown-zip"
          busy={busyAction === 'markdown-zip'}
          disabled={buttonDisabled(busyAction, vaultReady, onImportMarkdownZip)}
          onClick={onImportMarkdownZip}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.previewBear')}
          testId="settings-preview-bear"
          busy={busyAction === 'bear-preview'}
          busyLabel={previewing}
          disabled={buttonDisabled(busyAction, vaultReady, onPreviewBear)}
          onClick={onPreviewBear}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importBear')}
          testId="settings-import-bear"
          busy={busyAction === 'bear'}
          disabled={buttonDisabled(busyAction, vaultReady, onImportBear)}
          onClick={onImportBear}
          t={t}
        />
      </>
    )
  }

  function renderExportActions(): ReactNode {
    return (
      <PortabilityExportActions
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
        onExportMarkdownZip={onExportMarkdownZip}
        onExportStaticHtmlArchive={onExportStaticHtmlArchive}
        onPreviewJsonSnapshot={onPreviewJsonSnapshot}
        onExportJsonSnapshot={onExportJsonSnapshot}
        onPreviewSqliteSnapshot={onPreviewSqliteSnapshot}
        onExportSqliteSnapshot={onExportSqliteSnapshot}
      />
    )
  }
}

function buildLanes(t: Translate): LaneConfig[] {
  return [
    {
      id: 'markdown',
      label: t('settings.portability.actionLaneMarkdown'),
      description: t('settings.portability.actionLaneMarkdownDescription'),
      icon: <FolderOpen size={14} />,
    },
    {
      id: 'apps',
      label: t('settings.portability.actionLaneApps'),
      description: t('settings.portability.actionLaneAppsDescription'),
      icon: <DownloadSimple size={14} />,
    },
    {
      id: 'journals',
      label: t('settings.portability.actionLaneJournals'),
      description: t('settings.portability.actionLaneJournalsDescription'),
      icon: <DownloadSimple size={14} />,
    },
    {
      id: 'export',
      label: t('settings.portability.actionLaneExport'),
      description: t('settings.portability.actionLaneExportDescription'),
      icon: <UploadSimple size={14} />,
    },
    {
      id: 'storage',
      label: t('settings.portability.actionLaneStorage'),
      description: t('settings.portability.actionLaneStorageDescription'),
      icon: <Cloud size={14} />,
    },
  ]
}

function buttonDisabled(
  busyAction: VaultPortabilityActionId | null,
  vaultReady: boolean,
  onClick?: () => void,
): boolean {
  return Boolean(busyAction) || !vaultReady || !onClick
}

function laneForAction(action: VaultPortabilityActionId | null): PortabilityActionLane | null {
  if (!action) return null
  if (action.startsWith('storage-')) return 'storage'
  if (action.startsWith('export-')) return 'export'
  if (action === 'apple-journal-preview' || action === 'apple-journal' || action === 'day-one-preview') {
    return 'journals'
  }
  if (action === 'day-one' || action === 'journey-preview' || action === 'journey') return 'journals'
  if (action === 'obsidian-preview' || action === 'obsidian' || action.startsWith('notion-')) return 'apps'
  if (action === 'spanda-preview' || action === 'spanda') return 'apps'
  return 'markdown'
}
