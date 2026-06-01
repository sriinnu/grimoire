import { Archive, Cloud, DownloadSimple, FolderOpen, UploadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { hasReviewedImportPreview, importRequiresReview } from '../lib/importReviewGate'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityActionDeckProps, PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'

export type PortabilityActionLane = 'markdown' | 'apps' | 'journals' | 'capsules' | 'export' | 'storage'

export interface LaneConfig {
  id: PortabilityActionLane
  label: string
  description: string
  icon: ReactNode
}

/** Build the Settings portability lanes from the active UI language. */
export function buildPortabilityActionLanes(t: PortabilityActionDeckTranslate): LaneConfig[] {
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
      id: 'capsules',
      label: t('settings.portability.actionLaneCapsules'),
      description: t('settings.portability.actionLaneCapsulesDescription'),
      icon: <Archive size={14} />,
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

/** Map an in-flight portability action back to its visible Settings lane. */
export function laneForPortabilityAction(action: VaultPortabilityActionId | null): PortabilityActionLane | null {
  if (!action) return null
  if (action.startsWith('storage-')) return 'storage'
  if (action.startsWith('export-')) return 'export'
  if (action === 'apple-journal-preview' || action === 'apple-journal' || action === 'day-one-preview') {
    return 'journals'
  }
  if (action === 'day-one' || action === 'journey-preview' || action === 'journey') return 'journals'
  if (action.includes('capsule')) return 'capsules'
  if (action === 'obsidian-preview' || action === 'obsidian' || action.startsWith('notion-')) return 'apps'
  if (action === 'spanda-preview' || action === 'spanda') return 'apps'
  return 'markdown'
}

/** Chooses the lane that contains the latest reviewed preview or proof report. */
export function laneForPortabilityReviewState({
  exportPreview,
  hasStorageReview,
  importPreview,
}: Pick<PortabilityActionDeckProps, 'exportPreview' | 'importPreview'> & {
  hasStorageReview: boolean
}): PortabilityActionLane {
  if (hasStorageReview) return 'storage'
  if (exportPreview) return 'export'
  return laneForPortabilityAction(importPreview?.sourceId ?? null) ?? 'markdown'
}

/** Determine whether an action button can run under the current preview/review state. */
export function isPortabilityActionDisabled(
  busyAction: VaultPortabilityActionId | null,
  vaultReady: boolean,
  onClick?: () => void,
  actionId?: VaultPortabilityActionId,
  importPreview?: PortabilityActionDeckProps['importPreview'],
): boolean {
  const importLocked = actionId ? importRequiresReview(actionId) && !hasReviewedImportPreview(actionId, importPreview) : false
  return Boolean(busyAction) || !vaultReady || !onClick || importLocked
}
