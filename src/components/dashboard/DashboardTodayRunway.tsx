import { ArrowRight, Brain, Feather, ListChecks, Lock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AttentionModeSuggestion } from '../../lib/attentionMode'
import type { CaptureKind } from '../../utils/dashboardCapture'
import type { DailyBrief, DashboardSummary } from '../../utils/dashboardModel'
import { flowKindForCaptureKind, type DashboardFlowKind } from './DashboardTodayRunwayModel'
import './DashboardTodayRunway.css'

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
  { kind: 'note', label: 'Capture', detail: 'Drop the thought.', icon: Feather },
  { kind: 'journal', label: 'Reflect', detail: 'Tell the truth.', icon: Brain },
  { kind: 'task', label: 'Organize', detail: 'Pick the next move.', icon: ListChecks },
  { kind: 'ask', label: 'Crystallize', detail: 'Ask, then review.', icon: Sparkles },
] as const
type FlowStepState = 'done' | 'next' | 'open'

function reviewLabel(count: number, lane: string): string {
  if (count === 0) return `${lane} clear`
  return `${count} ${lane} review${count === 1 ? '' : 's'}`
}

function attentionFlowKind(
  summary: DashboardTodayRunwayProps['summary'],
  captureKind: CaptureKind | null,
): DashboardFlowKind | null {
  const captureFlowKind = flowKindForCaptureKind(captureKind)
  if (captureFlowKind) return captureFlowKind
  if (summary.memoryQueueCount > 0 || summary.mobileReviewCount > 0) return 'task'
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
  if (summary.openLoopCount > 0 || summary.memoryQueueCount > 0 || summary.mobileReviewCount > 0) return 'task'
  if (summary.crystallizedTodayCount === 0) return 'ask'
  return 'note'
}

function stepState(kind: DashboardFlowKind, nextKind: DashboardFlowKind, summary: DashboardTodayRunwayProps['summary']): FlowStepState {
  if (kind === 'journal' && summary.hasJournalToday) return 'done'
  if (kind === nextKind) return 'next'
  if (kind === 'task' && summary.hasJournalToday && summary.memoryQueueCount === 0 && summary.mobileReviewCount === 0) {
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
  if (nextKind === 'task' && summary.memoryQueueCount > 0) return 'Review memory'
  if (nextKind === 'task' && summary.mobileReviewCount > 0) return 'Review mobile'
  if (nextKind === 'task' && actionLabel) return actionLabel
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
  if (state === 'done') return kind === 'task' ? 'Clear.' : 'Done today.'
  if (kind === nextKind && actionLabel) return actionLabel
  if (kind === 'ask' && summary.crystallizedTodayCount === 0) return 'Review next.'
  if (kind === 'journal' && !summary.hasJournalToday) return 'Due now.'
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
  const items = brief.supportingItems.length > 0 ? brief.supportingItems : ['Capture freely']
  const attentionKind = attentionFlowKind(summary, attentionCaptureKind)
  const nextKind = nextFlowKind(summary, canUseAttentionAction, attentionCaptureKind)
  const flowState = flowSteps.map(step => stepState(step.kind, nextKind, summary))
  const settledCount = flowState.filter(state => state === 'done').length
  const nextAction = nextActionCopy(nextKind, summary, attention.actionLabel)
  const progressValue = Math.min(flowSteps.length, Math.max(0, settledCount))
  const showAction = !!attention.actionLabel && canUseAttentionAction
  const activeFlowKind = selectedFlowKind ?? nextKind

  function runStep(kind: CaptureKind) {
    const flowKind = flowKindForCaptureKind(kind)
    if (!flowKind) return
    onSelectFlowKind(flowKind)
    if (flowKind === attentionKind && canUseAttentionAction) {
      onAttentionAction()
      return
    }
    onSeedPrompt(kind)
  }

  return (
    <section
      className="vault-dashboard__panel vault-dashboard__assistant-brief vault-dashboard__today-runway"
      data-testid="dashboard-today-runway"
    >
      <div className="vault-dashboard__today-runway-shell">
        <div className="vault-dashboard__assistant-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div data-testid="dashboard-assistant-brief" data-private-held={brief.privateHeldCount}>
          <div className="vault-dashboard__assistant-head">
            <div>
              <div className="vault-dashboard__panel-label vault-dashboard__assistant-label">
                <Sparkles size={13} />
                Today Runway
              </div>
              <h2>{brief.primaryLabel}</h2>
            </div>
            <div className="vault-dashboard__assistant-actions">
              <div className="vault-dashboard__assistant-lock">
                <Lock size={14} />
                Local metadata
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
            <span>Attention Mode</span>
            <strong>{attention.title}</strong>
            <p>{attention.detail}</p>
          </div>
          <div className="vault-dashboard__assistant-items" aria-label="Today brief">
            {items.map((item) => (
              <span key={item}>
                <Brain size={13} />
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="vault-dashboard__flow" data-testid="dashboard-daily-flow">
          <div className="vault-dashboard__flow-copy">
            <div className="vault-dashboard__panel-label">Daily Flow</div>
            <h2>Capture, reflect, organize, crystallize.</h2>
            <div className="vault-dashboard__flow-runway" aria-label="Daily flow runway">
              <span>Next: {nextAction}</span>
              <strong>{settledCount} of {flowSteps.length} settled</strong>
            </div>
            <div
              className="vault-dashboard__flow-meter"
              aria-hidden="true"
              data-progress={progressValue}
              data-testid="dashboard-daily-flow-meter"
            >
              {flowSteps.map(({ kind }) => <span key={kind} data-state={stepState(kind, nextKind, summary)} />)}
            </div>
            <div className="vault-dashboard__flow-states" aria-label="Daily flow state">
              <span>{summary.hasJournalToday ? 'Journal touched' : 'Journal due'}</span>
              <span>{summary.hasDreamToday ? 'Dream caught' : 'Dream open'}</span>
              <span>{summary.openLoopCount} loops</span>
              <span>{reviewLabel(summary.memoryQueueCount, 'memory')}</span>
              <span>{reviewLabel(summary.mobileReviewCount, 'mobile')}</span>
              <span>{summary.crystallizedTodayCount > 0 ? 'Crystallized today' : 'Crystallize open'}</span>
            </div>
          </div>
          <div className="vault-dashboard__flow-steps">
            {flowSteps.map(({ detail, icon: Icon, kind, label }) => {
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
                  <Icon size={16} />
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
