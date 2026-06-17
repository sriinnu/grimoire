import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  FilePlus2,
  Lock,
  NotebookTabs,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PulseCommit, SyncStatus, VaultEntry } from '../../types'
import type { VaultOption } from '../status-bar/types'
import type { DashboardCaptureResult } from '../../hooks/useDashboardCapture'
import type { DashboardAskContextPreview as DashboardAskContextPreviewModel } from '../../utils/dashboardAskContext'
import { buildAttentionModeSuggestion } from '../../lib/attentionMode'
import {
  CAPTURE_KIND_CONFIGS,
  type CaptureKind,
  type DashboardCaptureRequest,
} from '../../utils/dashboardCapture'
import type { DashboardCaptureTemplateId, DreamTemplateId, JournalTemplateId } from '../../utils/noteTemplates'
import { buildDashboardSummary } from '../../utils/dashboardModel'
import { formatTypeCount } from '../../utils/notebookCountLabels'
import { DashboardRecentNotesPanel } from './DashboardRecentNotesPanel'
import { DashboardInsightPanelsFallback } from './DashboardInsightPanelsFallback'
import { DashboardTodayRunway } from './DashboardTodayRunway'
import {
  captureKindForSlashInput,
  flowKindForCaptureKind,
  type DashboardFlowKind,
} from './DashboardTodayRunwayModel'
import { captureDateForOffset, type CaptureDateOffset } from './DashboardCaptureDatePickerModel'
import { DashboardQuickCapturePanel } from './DashboardQuickCapturePanel'
import { notebookTitle } from './vaultDashboardHeaderModel'
import { getNotebookVaultDisplayName } from '../../utils/vaultDisplayName'
import './VaultDashboardLayout.css'
import './VaultDashboardResponsive.css'
import './VaultDashboard.css'

const DashboardInsightPanels = lazy(async () => ({
  default: (await import('./DashboardInsightPanels')).DashboardInsightPanels,
}))

interface VaultDashboardProps {
  activeVault?: VaultOption
  conflictCount: number
  entries: VaultEntry[]
  isGitVault: boolean
  modifiedCount: number
  onCapture: (
    input: string,
    kind: CaptureKind,
    captureDate?: Date,
    templateId?: DashboardCaptureTemplateId | null,
  ) => Promise<DashboardCaptureResult>
  /** Create-notebook stays available from notebook menus, not the first writing surface. */
  onOpenCreateVault: () => void
  onOpenNote: (entry: VaultEntry) => void
  onPendingCaptureConsumed?: () => void
  pendingCaptureRequest?: DashboardCaptureRequest | null
  pulseCommits?: PulseCommit[]
  syncStatus: SyncStatus
  vaultPath: string
}

function StatTile({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="vault-dashboard__stat">
      <div className="vault-dashboard__stat-value">{value}</div>
      <div className="vault-dashboard__stat-label">{label}</div>
      <div className="vault-dashboard__stat-detail">{detail}</div>
    </div>
  )
}

function PromptButton({
  children,
  onClick,
}: {
  children: string
  onClick: () => void
}) {
  return (
    <Button type="button" variant="ghost" className="vault-dashboard__prompt-button" onClick={onClick}>
      {children}
    </Button>
  )
}

function WaitingBucketRow({ count, label }: { count: number; label: string }) {
  return (
    <div className="vault-dashboard__loop-row">
      <span>{formatTypeCount(label, count)}</span>
    </div>
  )
}

/** First screen for the local-first assistant loop. */
export function VaultDashboard({
  activeVault,
  conflictCount,
  entries,
  modifiedCount,
  onCapture,
  onOpenNote,
  onPendingCaptureConsumed,
  pendingCaptureRequest,
  pulseCommits = [],
  syncStatus,
  vaultPath,
}: VaultDashboardProps) {
  const [selectedKind, setSelectedKind] = useState<CaptureKind>('note')
  const [selectedFlowKind, setSelectedFlowKind] = useState<DashboardFlowKind | null>(null)
  const [selectedTemplates, setSelectedTemplates] = useState<{
    dream: DreamTemplateId
    journal: JournalTemplateId
  }>({ dream: 'capture', journal: 'daily' })
  const [captureDateOffset, setCaptureDateOffset] = useState<CaptureDateOffset>(0)
  const [captureDateOverride, setCaptureDateOverride] = useState<Date | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [askContextPreview, setAskContextPreview] = useState<DashboardAskContextPreviewModel | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const summary = useMemo(() => buildDashboardSummary(entries), [entries])
  const attentionSuggestion = useMemo(
    () => buildAttentionModeSuggestion({ conflictCount, modifiedCount, summary, syncStatus }),
    [conflictCount, modifiedCount, summary, syncStatus],
  )
  const attentionCaptureKind = attentionSuggestion.captureKind
  const attentionOpenEntry = useMemo(
    () => attentionSuggestion.openEntryPath
      ? entries.find((entry) => entry.path === attentionSuggestion.openEntryPath) ?? null
      : null,
    [attentionSuggestion.openEntryPath, entries],
  )
  const activeVaultLabel = getNotebookVaultDisplayName({ label: activeVault?.label, path: vaultPath })
  const activeNotebookTitle = notebookTitle(activeVaultLabel)
  const showAskContextPreview = selectedKind === 'ask' || /^\s*\/ask\b/i.test(input)
  const canUseAttentionAction = !!attentionSuggestion.actionLabel && (!!attentionCaptureKind || !!attentionOpenEntry)
  const selectedTemplateId: DashboardCaptureTemplateId | null = selectedKind === 'journal'
    ? selectedTemplates.journal
    : selectedKind === 'dream'
      ? selectedTemplates.dream
      : null

  useEffect(() => {
    if (!showAskContextPreview) {
      setAskContextPreview(null)
      return
    }

    let cancelled = false
    import('../../utils/dashboardAskContext').then(({ buildDashboardAskContextPreview }) => {
      if (!cancelled) setAskContextPreview(buildDashboardAskContextPreview(entries, 5, input))
    })
    return () => { cancelled = true }
  }, [entries, input, showAskContextPreview])

  useEffect(() => {
    if (!pendingCaptureRequest) return
    const { kind } = pendingCaptureRequest
    const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === kind)
    if (!config) return
    setSelectedKind(kind)
    setSelectedFlowKind(flowKindForCaptureKind(kind))
    setInput((value) => value.trim() ? value : `${config.slash} `)
    requestAnimationFrame(() => inputRef.current?.focus())
    onPendingCaptureConsumed?.()
  }, [onPendingCaptureConsumed, pendingCaptureRequest])

  async function handleSubmit() {
    if (busy) return
    setBusy(true)
    try {
      const result = await onCapture(
        input,
        selectedKind,
        captureDateOverride ?? captureDateForOffset(captureDateOffset),
        selectedTemplateId,
      )
      if (result.status === 'created' || result.status === 'ask') {
        setInput('')
        setCaptureDateOffset(0)
        setCaptureDateOverride(null)
      }
    } finally {
      setBusy(false)
    }
  }

  function seedPrompt(kind: CaptureKind, promptSeed?: string, captureDate?: Date) {
    const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === kind)!
    setSelectedKind(kind)
    setSelectedFlowKind(flowKindForCaptureKind(kind))
    setCaptureDateOverride(captureDate ?? null)
    setInput((value) => value.trim() ? value : promptSeed ?? `${config.slash} `)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function updateCaptureInput(value: string) {
    const slashKind = captureKindForSlashInput(value)
    if (slashKind) {
      setSelectedKind(slashKind)
      setSelectedFlowKind(flowKindForCaptureKind(slashKind))
    }
    setInput(value)
  }

  function selectCaptureKind(kind: CaptureKind) {
    setSelectedKind(kind)
    setSelectedFlowKind(flowKindForCaptureKind(kind))
  }

  function seedDatedPrompt(kind: CaptureKind, date?: unknown) {
    seedPrompt(kind, undefined, date instanceof Date ? date : undefined)
  }

  function selectCaptureDateOffset(offset: CaptureDateOffset) {
    setCaptureDateOffset(offset)
    setCaptureDateOverride(null)
  }

  function selectTemplate(templateId: DashboardCaptureTemplateId) {
    if (selectedKind === 'journal') {
      setSelectedTemplates((current) => ({ ...current, journal: templateId as JournalTemplateId }))
    }
    if (selectedKind === 'dream') {
      setSelectedTemplates((current) => ({ ...current, dream: templateId as DreamTemplateId }))
    }
  }

  function handleAttentionAction() {
    if (attentionCaptureKind) {
      seedPrompt(attentionCaptureKind, attentionSuggestion.promptSeed)
      return
    }
    if (attentionOpenEntry) {
      setSelectedFlowKind('revisit')
      onOpenNote(attentionOpenEntry)
    }
  }

  return (
    <main className="vault-dashboard" data-testid="vault-dashboard">
      <section className="vault-dashboard__hero">
        <div className="vault-dashboard__hero-copy">
          <div className="vault-dashboard__eyebrow">
            <NotebookTabs size={14} />
            Grimoire
          </div>
          <h1>{activeNotebookTitle}</h1>
          <p className="vault-dashboard__subtitle">One living notebook, private by default.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="vault-dashboard__new-page-button"
          aria-label="New Page"
          title="New Page"
          onClick={() => seedPrompt('note')}
          data-testid="dashboard-new-page"
        >
          <FilePlus2 size={16} />
        </Button>
      </section>

      <section className="vault-dashboard__grid">
        <DashboardQuickCapturePanel
          askContextPreview={askContextPreview}
          busy={busy}
          captureDateOffset={captureDateOffset}
          captureDateOverride={captureDateOverride}
          input={input}
          inputRef={inputRef}
          selectedKind={selectedKind}
          selectedTemplateId={selectedTemplateId}
          showAskContextPreview={showAskContextPreview}
          onInputChange={updateCaptureInput}
          onSelectDateOffset={selectCaptureDateOffset}
          onSelectKind={selectCaptureKind}
          onSelectTemplate={selectTemplate}
          onSubmit={handleSubmit}
        />

        <DashboardTodayRunway
          attention={attentionSuggestion}
          attentionCaptureKind={attentionCaptureKind}
          brief={summary.dailyBrief}
          canUseAttentionAction={canUseAttentionAction}
          onAttentionAction={handleAttentionAction}
          onSelectFlowKind={setSelectedFlowKind}
          onSeedPrompt={seedPrompt}
          selectedFlowKind={selectedFlowKind}
          summary={summary}
        />

        <Suspense fallback={<DashboardInsightPanelsFallback />}>
          <DashboardInsightPanels
            crystallizedTodayCount={summary.crystallizedTodayCount}
            entries={entries}
            onCaptureDream={(date) => seedDatedPrompt('dream', date)}
            onCaptureJournal={(date) => seedDatedPrompt('journal', date)}
            onStartAsk={(promptSeed) => seedPrompt('ask', promptSeed)}
            pulseCommits={pulseCommits}
          />
        </Suspense>

        <div className="vault-dashboard__panel">
          <div className="vault-dashboard__panel-head">
            <div>
              <div className="vault-dashboard__panel-label">Revisit</div>
              <h2>{summary.openLoopCount > 0 ? 'Pages to return to.' : 'No loose pages.'}</h2>
            </div>
            <CalendarDays size={18} />
          </div>
          <div className="vault-dashboard__loop-list">
            {summary.openLoopBuckets.length > 0 ? summary.openLoopBuckets.map((bucket) => (
              <WaitingBucketRow key={bucket.label} count={bucket.count} label={bucket.label} />
            )) : (
              <div className="vault-dashboard__empty">Nothing to revisit.</div>
            )}
          </div>
        </div>

        <div className="vault-dashboard__panel">
          <div className="vault-dashboard__panel-head">
            <div>
              <div className="vault-dashboard__panel-label">Private pages</div>
              <h2>Journal, dream, next.</h2>
            </div>
            <Lock size={18} />
          </div>
          <div className="vault-dashboard__prompts">
            <PromptButton onClick={() => seedPrompt('journal')}>
              {summary.hasJournalToday ? 'Journal touched today' : 'Journal a check-in'}
            </PromptButton>
            <PromptButton onClick={() => seedPrompt('dream')}>
              {summary.hasDreamToday ? 'Dream captured today' : 'Catch a dream'}
            </PromptButton>
            <PromptButton onClick={() => seedPrompt('task')}>Carry one page forward</PromptButton>
          </div>
        </div>

        <div className="vault-dashboard__stats">
          <StatTile label="Pages" value={summary.activeNotes} detail="active local notes" />
          <StatTile label="Journals" value={summary.journalCount} detail="private by default" />
          <StatTile label="Dreams" value={summary.dreamCount} detail="held local" />
          <StatTile label="Memory" value={summary.memoryQueueCount} detail="review queue" />
        </div>

        <DashboardRecentNotesPanel
          entries={summary.recentEntries}
          onOpenNote={onOpenNote}
          protectedCount={summary.recentProtectedCount}
        />
      </section>
    </main>
  )
}
