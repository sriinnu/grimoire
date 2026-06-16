import { ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AttentionModeSuggestion } from '../../lib/attentionMode'
import type { CaptureKind } from '../../utils/dashboardCapture'
import type { DailyBrief, DashboardSummary } from '../../utils/dashboardModel'
import { flowKindForCaptureKind, type DashboardFlowKind } from './DashboardTodayRunwayModel'
import './DashboardTodayRunway.css'
import './DashboardTodayRunwayMotion.css'
import './DashboardTodayRunwayResponsive.css'

interface DashboardTodayRunwayProps {
  attention: AttentionModeSuggestion
  attentionCaptureKind: CaptureKind | null
  brief: DailyBrief
  canUseAttentionAction: boolean
  onAttentionAction: () => void
  onSelectFlowKind: (kind: DashboardFlowKind) => void
  onSeedPrompt: (kind: CaptureKind) => void
  selectedFlowKind: DashboardFlowKind | null
  summary: Pick<DashboardSummary,
    'crystallizedTodayCount' | 'hasDreamToday' | 'hasJournalToday' | 'memoryQueueCount' | 'mobileReviewCount' | 'openLoopCount'
  >
}

const flowSteps = [
  { kind: 'note', label: 'Write', detail: 'Let the thought land.' },
  { kind: 'journal', label: 'Notice', detail: 'Tell the truth.' },
  { kind: 'revisit', label: 'Gather', detail: 'Carry one page forward.' },
  { kind: 'ask', label: 'Remember', detail: 'Ask, then decide.' },
] as const
type FlowStepState = 'done' | 'next' | 'open'

function reviewLabel(count: number, lane: string): string {
  if (count === 0) return `${lane} clear`
  return `${count} ${lane} review${count === 1 ? '' : 's'}`
}

function loopLabel(count: number): string {
  if (count === 0) return 'Pages clear'
  return 'Pages to revisit'
}

function isCalmBriefItem(item: string): boolean {
  if (/^\d+ pages? waiting$/iu.test(item)) return false
  if (/^\d+ (notes?|people|projects?|tasks?|events?|checkpoints?)$/iu.test(item)) return false
  return true
}

function calmBriefItems(items: string[]): string[] {
  const quieterItems = items.filter(isCalmBriefItem).slice(0, 3)
  return quieterItems.length > 0 ? quieterItems : ['Capture freely']
}

function attentionFlowKind(
  summary: DashboardTodayRunwayProps['summary'],
  captureKind: CaptureKind | null,
): DashboardFlowKind | null {
  const captureFlowKind = flowKindForCaptureKind(captureKind)
  if (captureFlowKind) return captureFlowKind
  if (summary.memoryQueueCount > 0 || summary.mobileReviewCount > 0) return 'revisit'
  return null
}

function nextFlowKind(
  summary: DashboardTodayRunwayProps['summary'],
  canUseAttentionAction: boolean,
  attentionCaptureKind: CaptureKind | null,
): DashboardFlowKind {
  if (canUseAttentionAction) {
    const attentionKind = attentionFlowKind(summary, attentionCaptureKind)
    if (attentionKind) return attentionKind
  }
  if (!summary.hasJournalToday) return 'journal'
  if (summary.openLoopCount > 0 || summary.memoryQueueCount > 0 || summary.mobileReviewCount > 0) return 'revisit'
  if (summary.crystallizedTodayCount === 0) return 'ask'
  return 'note'
}

function stepState(kind: DashboardFlowKind, nextKind: DashboardFlowKind, summary: DashboardTodayRunwayProps['summary']): FlowStepState {
  if (kind === 'journal' && summary.hasJournalToday) return 'done'
  if (kind === nextKind) return 'next'
  if (kind === 'revisit' && summary.hasJournalToday && summary.memoryQueueCount === 0 && summary.mobileReviewCount === 0) {
    return 'done'
  }
  if (kind === 'ask' && summary.crystallizedTodayCount > 0) return 'done'
  return 'open'
}

function nextActionCopy(
  nextKind: DashboardFlowKind,
  summary: DashboardTodayRunwayProps['summary'],
  actionLabel: string | null,
): string {
  if (nextKind === 'revisit' && summary.memoryQueueCount > 0) return 'Review memory'
  if (nextKind === 'revisit' && summary.mobileReviewCount > 0) return 'Review mobile'
  if (nextKind === 'revisit' && actionLabel) return actionLabel
  return flowSteps.find(step => step.kind === nextKind)?.label ?? 'Capture'
}

function stepDetail(
  kind: DashboardFlowKind,
  nextKind: DashboardFlowKind,
  state: FlowStepState,
  detail: string,
  summary: DashboardTodayRunwayProps['summary'],
  actionLabel: string | null,
): string {
  if (state === 'done') return kind === 'revisit' ? 'Held.' : 'Touched today.'
  if (kind === nextKind && actionLabel) return actionLabel
  if (kind === 'ask' && summary.crystallizedTodayCount === 0) return 'Remember next.'
  if (kind === 'journal' && !summary.hasJournalToday) return 'Open today.'
  return detail
}

/** Single local-first dashboard runway for the day's one calm next action. */
export function DashboardTodayRunway({
  attention,
  attentionCaptureKind,
  brief,
  canUseAttentionAction,
  onAttentionAction,
  onSelectFlowKind,
  onSeedPrompt,
  selectedFlowKind,
  summary,
}: DashboardTodayRunwayProps) {
  const items = calmBriefItems(brief.supportingItems.length > 0 ? brief.supportingItems : ['Capture freely'])
  const attentionKind = attentionFlowKind(summary, attentionCaptureKind)
  const nextKind = nextFlowKind(summary, canUseAttentionAction, attentionCaptureKind)
  const flowState = flowSteps.map(step => stepState(step.kind, nextKind, summary))
  const heldCount = flowState.filter(state => state === 'done').length
  const nextAction = nextActionCopy(nextKind, summary, attention.actionLabel)
  const progressValue = Math.min(flowSteps.length, Math.max(0, heldCount))
  const showAction = !!attention.actionLabel && canUseAttentionAction
  const activeFlowKind = selectedFlowKind ?? nextKind

  function runStep(kind: DashboardFlowKind) {
    onSelectFlowKind(kind)
    if (kind === attentionKind && canUseAttentionAction) {
      onAttentionAction()
      return
    }
    onSeedPrompt(kind === 'revisit' ? 'task' : kind)
  }

  return (
    <section
      className="vault-dashboard__panel vault-dashboard__assistant-brief vault-dashboard__today-runway"
      data-testid="dashboard-today-runway"
    >
      <div className="vault-dashboard__today-runway-shell">
        <div data-testid="dashboard-assistant-brief" data-private-held={brief.privateHeldCount}>
          <div className="vault-dashboard__assistant-head">
            <div>
              <div className="vault-dashboard__panel-label vault-dashboard__assistant-label">
                Today
              </div>
              <h2>{brief.primaryLabel}</h2>
            </div>
            <div className="vault-dashboard__assistant-actions">
              <div className="vault-dashboard__assistant-lock">
                <Lock size={14} />
                Private
              </div>
              {showAction ? (
                <Button
                  type="button"
                  size="sm"
                  className="vault-dashboard__assistant-action"
                  onClick={onAttentionAction}
                >
                  {attention.actionLabel}
                  <ArrowRight size={14} />
                </Button>
              ) : null}
            </div>
          </div>
          <div
            className="vault-dashboard__assistant-focus"
            aria-label="One next action"
            data-testid="dashboard-one-next-action"
          >
            <span>Return</span>
            <strong>{attention.title}</strong>
            <p>{attention.detail}</p>
          </div>
          <div className="vault-dashboard__assistant-items" aria-label="Today brief">
            {items.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
        <div className="vault-dashboard__flow" data-testid="dashboard-daily-flow">
          <div className="vault-dashboard__flow-copy">
            <div className="vault-dashboard__panel-label">Today</div>
            <h2>One page at a time.</h2>
            <div className="vault-dashboard__flow-runway" aria-label="Daily rhythm rail">
              <span>Next: {nextAction}</span>
              <strong>{heldCount} of {flowSteps.length} held</strong>
            </div>
            <div
              className="vault-dashboard__flow-meter"
              aria-hidden="true"
              data-progress={progressValue}
              data-testid="dashboard-daily-flow-meter"
            >
              {flowSteps.map(({ kind }) => <span key={kind} data-state={stepState(kind, nextKind, summary)} />)}
            </div>
            <div className="vault-dashboard__flow-states" aria-label="Daily rhythm state">
              <span>{summary.hasJournalToday ? 'Journal touched' : 'Journal open'}</span>
              <span>{summary.hasDreamToday ? 'Dream caught' : 'Dream open'}</span>
              <span>{loopLabel(summary.openLoopCount)}</span>
              <span>{reviewLabel(summary.memoryQueueCount, 'memory')}</span>
              <span>{reviewLabel(summary.mobileReviewCount, 'mobile')}</span>
              <span>{summary.crystallizedTodayCount > 0 ? 'Remembered today' : 'Remember next'}</span>
            </div>
          </div>
          <div className="vault-dashboard__flow-steps">
            {flowSteps.map(({ detail, kind, label }) => {
              const state = stepState(kind, nextKind, summary)
              const selected = activeFlowKind === kind
              return (
                <Button
                  key={kind}
                  type="button"
                  variant="ghost"
                  className="vault-dashboard__flow-step"
                  onClick={() => runStep(kind)}
                  aria-current={selected ? 'step' : undefined}
                  aria-pressed={selected}
                  data-selected={selected ? 'true' : 'false'}
                  data-state={state}
                >
                  <span>
                    <strong>{label}</strong>
                    <small>{stepDetail(kind, nextKind, state, detail, summary, attention.actionLabel)}</small>
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
