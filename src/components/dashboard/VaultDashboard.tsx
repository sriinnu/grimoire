import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  Brain,
  CalendarDays,
  Cloud,
  Lock,
  NotebookTabs,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { buildDashboardSummary } from '../../utils/dashboardModel'
import { cn } from '../../lib/utils'
import { DashboardRecentNotesPanel } from './DashboardRecentNotesPanel'
import { DashboardInsightPanelsFallback } from './DashboardInsightPanelsFallback'
import { DashboardTodayRunway } from './DashboardTodayRunway'
import './VaultDashboard.css'

const DashboardAskContextPreview = lazy(async () => ({
  default: (await import('./DashboardAskContextPreview')).DashboardAskContextPreview,
}))

const DashboardInsightPanels = lazy(async () => ({
  default: (await import('./DashboardInsightPanels')).DashboardInsightPanels,
}))

interface VaultDashboardProps {
  activeVault?: VaultOption
  conflictCount: number
  entries: VaultEntry[]
  isGitVault: boolean
  modifiedCount: number
  onCapture: (input: string, kind: CaptureKind) => Promise<DashboardCaptureResult>
  onOpenCreateVault: () => void
  onOpenNote: (entry: VaultEntry) => void
  onPendingCaptureConsumed?: () => void
  pendingCaptureRequest?: DashboardCaptureRequest | null
  pulseCommits?: PulseCommit[]
  syncStatus: SyncStatus
  vaultPath: string
}

function storageLabel(activeVault?: VaultOption): string {
  const provider = activeVault?.storageProvider
  if (provider === 'icloud-drive') return 'Personal Sync'
  if (provider === 'google-drive-desktop') return 'Personal Sync'
  if (provider === 'cloud-folder') return 'Personal Sync'
  if (provider === 's3' || provider === 'azure-blob') return 'Export Allowed'
  return 'Local'
}

function syncLabel(syncStatus: SyncStatus, modifiedCount: number, conflictCount: number): string {
  if (conflictCount > 0 || syncStatus === 'conflict') return 'Conflicts'
  if (syncStatus === 'syncing') return 'Syncing'
  if (syncStatus === 'pull_required') return 'Pull Needed'
  if (syncStatus === 'error') return 'Sync Check'
  if (modifiedCount > 0) return `${modifiedCount} Pending`
  return 'Clean'
}

function DashboardBadge({
  icon: Icon,
  label,
  tone = 'neutral',
}: {
  icon: LucideIcon
  label: string
  tone?: 'green' | 'blue' | 'orange' | 'neutral'
}) {
  return (
    <span className={cn('vault-dashboard__badge', `vault-dashboard__badge--${tone}`)}>
      <Icon size={13} />
      {label}
    </span>
  )
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

function CapturePill({
  kind,
  selected,
  onSelect,
}: {
  kind: CaptureKind
  selected: boolean
  onSelect: (kind: CaptureKind) => void
}) {
  const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === kind)!
  return (
    <Button
      type="button"
      variant={selected ? 'default' : 'outline'}
      size="sm"
      className="vault-dashboard__capture-pill"
      onClick={() => onSelect(kind)}
      data-testid={`dashboard-capture-kind-${kind}`}
    >
      {config.label}
    </Button>
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

/** First screen for the local-first assistant loop. */
export function VaultDashboard({
  activeVault,
  conflictCount,
  entries,
  isGitVault,
  modifiedCount,
  onCapture,
  onOpenCreateVault,
  onOpenNote,
  onPendingCaptureConsumed,
  pendingCaptureRequest,
  pulseCommits = [],
  syncStatus,
  vaultPath,
}: VaultDashboardProps) {
  const [selectedKind, setSelectedKind] = useState<CaptureKind>('note')
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
  const activeVaultLabel = activeVault?.label ?? vaultPath.split('/').filter(Boolean).pop() ?? 'Vault'
  const showAskContextPreview = selectedKind === 'ask' || /^\s*\/ask\b/i.test(input)
  const canUseAttentionAction = !!attentionSuggestion.actionLabel && (!!attentionCaptureKind || !!attentionOpenEntry)

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
    setInput((value) => value.trim() ? value : `${config.slash} `)
    requestAnimationFrame(() => inputRef.current?.focus())
    onPendingCaptureConsumed?.()
  }, [onPendingCaptureConsumed, pendingCaptureRequest])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const result = await onCapture(input, selectedKind)
      if (result.status === 'created' || result.status === 'ask') {
        setInput('')
      }
    } finally {
      setBusy(false)
    }
  }

  function seedPrompt(kind: CaptureKind, promptSeed?: string) {
    const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === kind)!
    setSelectedKind(kind)
    setInput((value) => value.trim() ? value : promptSeed ?? `${config.slash} `)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function handleAttentionAction() {
    if (attentionCaptureKind) {
      seedPrompt(attentionCaptureKind, attentionSuggestion.promptSeed)
      return
    }
    if (attentionOpenEntry) onOpenNote(attentionOpenEntry)
  }

  return (
    <main className="vault-dashboard" data-testid="vault-dashboard">
      <section className="vault-dashboard__hero">
        <div className="vault-dashboard__hero-copy">
          <div className="vault-dashboard__eyebrow">
            <Sparkles size={14} />
            {activeVaultLabel}
          </div>
          <h1>Sriinnu, here is the board.</h1>
          <div className="vault-dashboard__badges" aria-label="Vault locality">
            <DashboardBadge icon={Lock} label={storageLabel(activeVault)} tone="green" />
            <DashboardBadge icon={ShieldCheck} label="Cloud Blocked" tone="blue" />
            <DashboardBadge icon={Cloud} label={syncLabel(syncStatus, modifiedCount, conflictCount)} tone={conflictCount > 0 ? 'orange' : 'neutral'} />
            <DashboardBadge icon={Brain} label={isGitVault ? 'Git Optional' : 'No Git Needed'} tone="neutral" />
          </div>
        </div>
        <Button type="button" variant="outline" onClick={onOpenCreateVault} data-testid="dashboard-create-vault">
          <NotebookTabs size={16} />
          New Vault
        </Button>
      </section>

      <section className="vault-dashboard__grid">
        <DashboardTodayRunway
          attention={attentionSuggestion}
          attentionCaptureKind={attentionCaptureKind}
          brief={summary.dailyBrief}
          canUseAttentionAction={canUseAttentionAction}
          onAttentionAction={handleAttentionAction}
          onSeedPrompt={seedPrompt}
          summary={summary}
        />

        <div className="vault-dashboard__panel vault-dashboard__panel--capture">
          <div className="vault-dashboard__panel-head">
            <div>
              <div className="vault-dashboard__panel-label">Quick Capture</div>
              <h2>Catch it before it evaporates.</h2>
            </div>
            <WandSparkles size={18} />
          </div>
          <form className="vault-dashboard__capture-form" onSubmit={handleSubmit}>
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={CAPTURE_KIND_CONFIGS.find((item) => item.kind === selectedKind)?.prompt}
              className="vault-dashboard__textarea"
              data-testid="dashboard-capture-input"
            />
            {showAskContextPreview && askContextPreview ? (
              <Suspense fallback={null}>
                <DashboardAskContextPreview preview={askContextPreview} />
              </Suspense>
            ) : null}
            <div className="vault-dashboard__capture-actions">
              <div className="vault-dashboard__capture-kinds">
                {CAPTURE_KIND_CONFIGS.map((config) => (
                  <CapturePill
                    key={config.kind}
                    kind={config.kind}
                    selected={selectedKind === config.kind}
                    onSelect={setSelectedKind}
                  />
                ))}
              </div>
              <Button type="submit" disabled={busy} data-testid="dashboard-capture-submit">
                {busy ? 'Capturing...' : 'Capture'}
              </Button>
            </div>
          </form>
        </div>

        <div className="vault-dashboard__panel">
          <div className="vault-dashboard__panel-head">
            <div>
              <div className="vault-dashboard__panel-label">Open Loops</div>
              <h2>{summary.openLoopCount} active</h2>
            </div>
            <CalendarDays size={18} />
          </div>
          <div className="vault-dashboard__loop-list">
            {summary.openLoopBuckets.length > 0 ? summary.openLoopBuckets.map((bucket) => (
              <div key={bucket.label} className="vault-dashboard__loop-row">
                <span>{bucket.label}</span>
                <strong>{bucket.count}</strong>
              </div>
            )) : (
              <div className="vault-dashboard__empty">Nothing open.</div>
            )}
          </div>
        </div>

        <div className="vault-dashboard__panel">
          <div className="vault-dashboard__panel-head">
            <div>
              <div className="vault-dashboard__panel-label">Daily Pulse</div>
              <h2>Private lanes</h2>
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
            <PromptButton onClick={() => seedPrompt('task')}>Name one next action</PromptButton>
          </div>
        </div>

        <div className="vault-dashboard__stats">
          <StatTile label="Notes" value={summary.activeNotes} detail="active local files" />
          <StatTile label="Journals" value={summary.journalCount} detail="private by default" />
          <StatTile label="Dreams" value={summary.dreamCount} detail="local lane" />
          <StatTile label="Memory" value={summary.memoryQueueCount} detail="review queue" />
        </div>

        <Suspense fallback={<DashboardInsightPanelsFallback />}>
          <DashboardInsightPanels
            crystallizedTodayCount={summary.crystallizedTodayCount}
            entries={entries}
            onCaptureDream={() => seedPrompt('dream')}
            onCaptureJournal={() => seedPrompt('journal')}
            onStartAsk={(promptSeed) => seedPrompt('ask', promptSeed)}
            pulseCommits={pulseCommits}
          />
        </Suspense>

        <DashboardRecentNotesPanel
          entries={summary.recentEntries}
          onOpenNote={onOpenNote}
          protectedCount={summary.recentProtectedCount}
        />
      </section>
    </main>
  )
}
