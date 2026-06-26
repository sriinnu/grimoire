import { Glyph } from './glyphs/Glyph'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppImportAutopsyActions } from './AppImportAutopsyActions'
import { JournalImportAutopsyActions } from './JournalImportAutopsyActions'
import { ObjectStoragePrototypeActions } from './ObjectStoragePrototypeActions'
import { PortabilityCapsuleImportActions } from './PortabilityCapsuleImportActions'
import type { PortabilityActionDeckProps } from './PortabilityActionDeck.types'
import {
  buildPortabilityActionLanes,
  isPortabilityActionDisabled,
  laneForPortabilityAction,
  laneForPortabilityReviewState,
  type PortabilityActionLane,
} from './PortabilityActionDeckModel'
import { PortabilityExportActions } from './PortabilityExportActions'
import { PortabilityImportButton } from './PortabilityActionButton'
import { PortabilityActionProgress } from './PortabilityActionProgress'
import { Button } from './ui/button'

/** Shows import/export/storage actions one lane at a time so Settings stays inspectable. */
export function PortabilityActionDeck({
  t,
  vaultReady,
  busyAction,
  importPreview,
  exportPreview,
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
  const hasStorageReview = Boolean(
    s3LivePreflightReport
    || azureLivePreflightReport
    || s3MirrorPreviewReport
    || s3MirrorPullPreviewReport
    || s3ProviderPushPreviewReport
    || s3ProviderPullPreviewReport
    || azureProviderPushPreviewReport
    || azureProviderPullPreviewReport
    || azureMirrorPreviewReport
    || azureMirrorPullPreviewReport,
  )
  const previewLane = laneForPortabilityReviewState({ exportPreview, hasStorageReview, importPreview })
  const [activeLane, setActiveLane] = useState<PortabilityActionLane>(previewLane)

  useEffect(() => {
    const busyLane = laneForPortabilityAction(busyAction)
    if (busyLane) setActiveLane(busyLane)
  }, [busyAction])

  useEffect(() => {
    if (!busyAction) setActiveLane(previewLane)
  }, [busyAction, previewLane])

  const lanes = useMemo(() => buildPortabilityActionLanes(t), [t])
  const activeConfig = lanes.find((lane) => lane.id === activeLane) ?? lanes[0]

  return (
    <section
      className="grimoire-portability-action-deck grid gap-3 rounded-md border border-border p-3"
      data-testid="settings-portability-action-deck"
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-foreground">{t('settings.portability.actionDeckTitle')}</div>
        <div className="max-w-[560px] text-[11px] leading-snug text-muted-foreground">
          {t('settings.portability.actionDeckDescription')}
        </div>
      </div>
      <div className="grimoire-portability-lanes flex flex-wrap gap-1 rounded-md border border-border p-1" role="tablist">
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
        {activeLane !== 'storage' && activeLane !== 'export' ? (
          <div
            className="grimoire-portability-review-gate flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-[11px] leading-snug text-muted-foreground"
            data-testid="settings-portability-preview-gate"
          >
            <Glyph name="shield" size={14} className="mt-0.5 shrink-0" />
            <span>{t('settings.portability.reviewGate')}</span>
          </div>
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
          importPreview={importPreview}
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
          importPreview={importPreview}
          onPreviewAppleJournal={onPreviewAppleJournal}
          onImportAppleJournal={onImportAppleJournal}
          onPreviewDayOne={onPreviewDayOne}
          onImportDayOne={onImportDayOne}
          onPreviewJourney={onPreviewJourney}
          onImportJourney={onImportJourney}
        />
      )
    }
    if (lane === 'capsules') {
      return (
        <PortabilityCapsuleImportActions
          t={t}
          vaultReady={vaultReady}
          busyAction={busyAction}
          importPreview={importPreview}
          onPreviewJsonCapsule={onPreviewJsonCapsule}
          onImportJsonCapsule={onImportJsonCapsule}
          onPreviewSqliteCapsule={onPreviewSqliteCapsule}
          onImportSqliteCapsule={onImportSqliteCapsule}
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
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onPreviewMarkdownFolder)}
          onClick={onPreviewMarkdownFolder}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importMarkdownFolder')}
          testId="settings-import-markdown-folder"
          busy={busyAction === 'markdown-folder'}
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onImportMarkdownFolder, 'markdown-folder', importPreview)}
          onClick={onImportMarkdownFolder}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.previewMarkdownZip')}
          testId="settings-preview-markdown-zip"
          busy={busyAction === 'markdown-zip-preview'}
          busyLabel={previewing}
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onPreviewMarkdownZip)}
          onClick={onPreviewMarkdownZip}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importMarkdownZip')}
          testId="settings-import-markdown-zip"
          busy={busyAction === 'markdown-zip'}
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onImportMarkdownZip, 'markdown-zip', importPreview)}
          onClick={onImportMarkdownZip}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.previewBear')}
          testId="settings-preview-bear"
          busy={busyAction === 'bear-preview'}
          busyLabel={previewing}
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onPreviewBear)}
          onClick={onPreviewBear}
          t={t}
        />
        <PortabilityImportButton
          label={t('settings.portability.importBear')}
          testId="settings-import-bear"
          busy={busyAction === 'bear'}
          disabled={isPortabilityActionDisabled(busyAction, vaultReady, onImportBear, 'bear', importPreview)}
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
        exportPreview={exportPreview}
      />
    )
  }
}
