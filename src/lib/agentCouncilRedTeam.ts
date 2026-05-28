import type { AgentCouncilSource } from './agentCouncil'
import type { RedTeamDimension, RedTeamPlanReview, RedTeamSeverity } from './redTeamPlan'

export interface RedTeamCouncilAction {
  label: string
  nextAction: string
  severity: RedTeamSeverity
}

/** Builds the source-safe Agent Council contribution for Red-Team My Plan. */
export function buildRedTeamCouncilContribution(
  review: RedTeamPlanReview | null | undefined,
  protectedContext: boolean,
): string {
  if (!review || review.state === 'empty') {
    return 'Can critique product, code, UX, privacy, evidence, and execution once a note is open.'
  }
  if (protectedContext || review.protectedContext) {
    return 'Can summarize critique without protected labels, paths, excerpts, or note bodies.'
  }
  const risks = review.signals.filter((signal) => signal.severity === 'risk')
  const watches = review.signals.filter((signal) => signal.severity === 'watch')
  if (risks.length > 0) return `Found ${countLabel(risks.length, 'risk')} before execution.`
  if (watches.length > 0) return `Found ${countLabel(watches.length, 'watch item')} to tighten before handoff.`
  return 'Plan critique is clear enough for a focused execution pass.'
}

/** Builds source labels for Red-Team My Plan without exposing note excerpts. */
export function buildRedTeamCouncilSources(
  review: RedTeamPlanReview | null | undefined,
  protectedContext: boolean,
  contextSources: AgentCouncilSource[],
): AgentCouncilSource[] {
  const sources: AgentCouncilSource[] = [
    ...contextSources,
    { kind: 'tool', label: 'Red-Team My Plan' },
  ]
  if (!review || protectedContext || review.protectedContext) return sources

  return [
    ...sources,
    ...review.signals
      .filter((signal) => signal.severity !== 'clear')
      .slice(0, 3)
      .map((signal) => ({
        kind: 'red-team' as const,
        label: `${signal.label}: ${signal.severity}`,
      })),
  ]
}

/** Builds source-safe Red Team next actions for the Council synthesis packet. */
export function buildRedTeamCouncilActions(
  review: RedTeamPlanReview | null | undefined,
  protectedContext: boolean,
): RedTeamCouncilAction[] {
  if (!review || review.state === 'empty') {
    return [{
      label: 'Red Team',
      nextAction: 'Open a note, plan, or issue before creating critique actions.',
      severity: 'watch',
    }]
  }

  if (protectedContext || review.protectedContext) {
    return [{
      label: 'Privacy',
      nextAction: 'Keep labels, paths, excerpts, and raw note content withheld from agent packets.',
      severity: 'clear',
    }]
  }

  return review.signals
    .filter((signal) => signal.severity !== 'clear' && isKnownDimension(signal.dimension))
    .slice(0, 4)
    .map((signal) => {
      const severity = isKnownSeverity(signal.severity) ? signal.severity : 'watch'
      return {
        label: SAFE_ACTION_COPY[signal.dimension].label,
        nextAction: SAFE_ACTION_COPY[signal.dimension].nextAction[severity],
        severity,
      }
    })
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function isKnownDimension(value: string): value is RedTeamDimension {
  return value in SAFE_ACTION_COPY
}

function isKnownSeverity(value: string): value is RedTeamSeverity {
  return value === 'clear' || value === 'watch' || value === 'risk'
}

const SAFE_ACTION_COPY: Record<
  RedTeamDimension,
  {
    label: string
    nextAction: Record<RedTeamSeverity, string>
  }
> = {
  product: {
    label: 'Product',
    nextAction: {
      clear: 'Keep the acceptance line close to the task.',
      watch: 'Add one user-facing outcome and one done condition.',
      risk: 'Add one user-facing outcome and one done condition.',
    },
  },
  code: {
    label: 'Code',
    nextAction: {
      clear: 'Keep the contract and regression close to the patch.',
      watch: 'Name the interface, failure mode, and regression test.',
      risk: 'Name the module, command, or component that must change.',
    },
  },
  execution: {
    label: 'Execution',
    nextAction: {
      clear: 'Keep one visible owner or next step.',
      watch: 'Add the next action, owner, and verification command.',
      risk: 'Pick the next three tasks and park the rest.',
    },
  },
  ux: {
    label: 'UX',
    nextAction: {
      clear: 'Keep the interaction state visible.',
      watch: 'Name the exact surface, state, and accessibility expectation.',
      risk: 'Name the exact surface, state, and accessibility expectation.',
    },
  },
  privacy: {
    label: 'Privacy',
    nextAction: {
      clear: 'Keep local-first defaults explicit.',
      watch: 'Show what can leave, what is withheld, and who approves it.',
      risk: 'Add what can leave, what is withheld, and who approves it.',
    },
  },
  evidence: {
    label: 'Evidence',
    nextAction: {
      clear: 'Tie each gate to the user flow it protects.',
      watch: 'Add the exact tests, build, or manual QA evidence required.',
      risk: 'Add the exact tests, build, or manual QA evidence required.',
    },
  },
}
