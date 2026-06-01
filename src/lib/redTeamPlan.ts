import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy } from './localityPolicy'

/** Critique lane used by the local Red-Team My Plan pass. */
export type RedTeamDimension = 'product' | 'code' | 'execution' | 'ux' | 'privacy' | 'evidence'

/** Severity for a sanitized red-team signal. */
export type RedTeamSeverity = 'clear' | 'watch' | 'risk'

/** Source-safe finding returned by a red-team critique lane. */
export interface RedTeamSignal {
  dimension: RedTeamDimension
  label: string
  severity: RedTeamSeverity
  finding: string
  nextAction: string
}

/** Source-safe critique summary for the active note or plan. */
export interface RedTeamPlanReview {
  state: 'empty' | 'ready'
  verdict: string
  protectedContext: boolean
  protectedReason: string | null
  counts: {
    words: number
    headings: number
    openTasks: number
    completedTasks: number
  }
  signals: RedTeamSignal[]
}

/** Local inputs used to derive a red-team critique without returning note text. */
export interface RedTeamPlanInput {
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
}

/** Builds a local-only red-team pass over the active note without returning note text. */
export function buildRedTeamPlanReview({
  activeEntry,
  activeNoteContent,
}: RedTeamPlanInput): RedTeamPlanReview {
  if (!activeEntry) return emptyReview()

  const content = activeNoteContent ?? activeEntry.snippet ?? ''
  const policy = resolveEntryLocalityPolicy(activeEntry)
  const metrics = contentMetrics(content)
  const signals = [
    productSignal(content),
    codeSignal(content),
    executionSignal(content, metrics),
    uxSignal(content),
    privacySignal(content, policy.localOnly),
    evidenceSignal(content),
  ]

  return {
    state: 'ready',
    verdict: verdictFor(signals, metrics),
    protectedContext: policy.localOnly,
    protectedReason: policy.localOnly ? policy.reason : null,
    counts: metrics,
    signals,
  }
}

function emptyReview(): RedTeamPlanReview {
  return {
    state: 'empty',
    verdict: 'Open a note to red-team the plan.',
    protectedContext: false,
    protectedReason: null,
    counts: { words: 0, headings: 0, openTasks: 0, completedTasks: 0 },
    signals: [],
  }
}

function contentMetrics(content: string): RedTeamPlanReview['counts'] {
  return {
    words: countWords(content),
    headings: matches(content, /^#{1,6}\s+/gm),
    openTasks: matches(content, /^\s*[-*]\s+\[\s\]/gm),
    completedTasks: matches(content, /^\s*[-*]\s+\[[xX]\]/gm),
  }
}

function productSignal(content: string): RedTeamSignal {
  const hasOutcome = hasAny(content, ['acceptance', 'definition of done', 'success', 'target', 'goal'])
  const hasUser = hasAny(content, ['user', 'workflow', 'problem', 'pain', 'job to be done'])
  if (hasOutcome && hasUser) {
    return signal('product', 'Product', 'clear', 'Outcome and user value are visible.', 'Keep the acceptance line close to the task.')
  }
  return signal(
    'product',
    'Product',
    hasOutcome || hasUser ? 'watch' : 'risk',
    'The plan can drift because user value or acceptance criteria are thin.',
    'Add one user-facing outcome and one done condition.',
  )
}

function codeSignal(content: string): RedTeamSignal {
  const hasCodeSurface = hasAny(content, [
    'api',
    'command',
    'component',
    'contract',
    'file',
    'function',
    'hook',
    'module',
    'schema',
    'tauri',
    'test',
    'typescript',
  ])
  const hasCodeBoundary = hasAny(content, [
    'adapter',
    'coverage',
    'failure',
    'interface',
    'locality',
    'permission',
    'regression',
    'type',
    'verification',
  ])
  if (hasCodeSurface && hasCodeBoundary) {
    return signal('code', 'Code', 'clear', 'Implementation surface and boundary are named.', 'Keep the contract and regression close to the patch.')
  }
  if (hasCodeSurface) {
    return signal(
      'code',
      'Code',
      'watch',
      'The code surface is visible, but the contract boundary is thin.',
      'Name the interface, failure mode, and regression test.',
    )
  }
  return signal(
    'code',
    'Code',
    'risk',
    'The implementation path is not concrete enough yet.',
    'Name the module, command, or component that must change.',
  )
}

function executionSignal(content: string, metrics: RedTeamPlanReview['counts']): RedTeamSignal {
  const hasNextAction = hasAny(content, ['next', 'owner', 'tonight', 'ship', 'commit', 'pr', 'merge'])
  if (metrics.openTasks > 8) {
    return signal(
      'execution',
      'Execution',
      'risk',
      'Too many open tasks compete for attention.',
      'Pick the next three tasks and park the rest.',
    )
  }
  if (hasNextAction && metrics.openTasks > 0) {
    return signal('execution', 'Execution', 'clear', 'There is a concrete next-action shape.', 'Keep one visible owner or next step.')
  }
  return signal(
    'execution',
    'Execution',
    'watch',
    'The plan needs a sharper next move.',
    'Add the next action, owner, and verification command.',
  )
}

function uxSignal(content: string): RedTeamSignal {
  const hasFlow = hasAny(content, ['flow', 'screen', 'modal', 'dashboard', 'settings', 'sidebar', 'editor', 'onboarding'])
  const hasAccessibility = hasAny(content, ['accessibility', 'keyboard', 'contrast', 'reduced motion', 'aria'])
  if (hasFlow && hasAccessibility) {
    return signal('ux', 'UX', 'clear', 'The surface and accessibility path are both named.', 'Keep the interaction state visible.')
  }
  return signal(
    'ux',
    'UX',
    hasFlow ? 'watch' : 'risk',
    'The user-facing path is not concrete enough yet.',
    'Name the exact surface, state, and accessibility expectation.',
  )
}

function privacySignal(content: string, localOnly: boolean): RedTeamSignal {
  const mentionsEgress = hasAny(content, ['cloud', 'sync', 'export', 'agent', 'share', 's3', 'azure', 'gdrive', 'icloud'])
  const hasGuard = hasAny(content, ['local-only', 'local only', 'withheld', 'privacy', 'egress', 'blocked', 'firewall'])
  if (localOnly) {
    return signal('privacy', 'Privacy', 'clear', 'Locality Firewall marks this context protected.', 'Keep counts and policy visible; do not expose labels externally.')
  }
  if (mentionsEgress && !hasGuard) {
    return signal(
      'privacy',
      'Privacy',
      'risk',
      'Egress is mentioned without a visible locality rule.',
      'Add what can leave, what is withheld, and who approves it.',
    )
  }
  return signal('privacy', 'Privacy', 'clear', 'No obvious egress hole in the plan text.', 'Keep local-first defaults explicit.')
}

function evidenceSignal(content: string): RedTeamSignal {
  const hasVerification = hasAny(content, ['test', 'lint', 'build', 'verify', 'qa', 'green', 'smoke', 'playwright', 'cargo', 'vitest'])
  if (hasVerification) {
    return signal('evidence', 'Evidence', 'clear', 'Verification is named in the plan.', 'Tie each gate to the user flow it protects.')
  }
  return signal(
    'evidence',
    'Evidence',
    'risk',
    'The plan does not say how truth will be proven.',
    'Add the exact tests, build, or manual QA evidence required.',
  )
}

function verdictFor(signals: RedTeamSignal[], metrics: RedTeamPlanReview['counts']): string {
  const riskCount = signals.filter((item) => item.severity === 'risk').length
  if (metrics.words === 0) return 'No body loaded; critique is metadata-only.'
  if (riskCount >= 3) return 'Not ready yet. Tighten scope, evidence, and user flow first.'
  if (riskCount > 0) return 'Promising, but one sharp risk needs work before execution.'
  return 'Plan is ready for a focused execution pass.'
}

function signal(
  dimension: RedTeamDimension,
  label: string,
  severity: RedTeamSeverity,
  finding: string,
  nextAction: string,
): RedTeamSignal {
  return { dimension, label, severity, finding, nextAction }
}

function countWords(content: string): number {
  return content.match(/\S+/g)?.length ?? 0
}

function matches(content: string, pattern: RegExp): number {
  return content.match(pattern)?.length ?? 0
}

function hasAny(content: string, needles: string[]): boolean {
  const normalized = content.toLowerCase()
  return needles.some((needle) => normalized.includes(needle))
}
