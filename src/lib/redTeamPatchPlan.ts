import type {
  RedTeamDimension,
  RedTeamPlanReview,
  RedTeamSeverity,
  RedTeamSignal,
} from './redTeamPlan'

/** Reviewable Markdown patch-plan preview derived from sanitized red-team signals. */
export interface RedTeamPatchPlan {
  title: string
  markdown: string
  checks: string[]
  protectedContext: boolean
}

/** Builds a review-only Markdown patch plan without writing files or exposing source text. */
export function buildRedTeamPatchPlan(review: RedTeamPlanReview): RedTeamPatchPlan {
  if (review.state === 'empty') {
    const checks = ['Open a note, plan, or issue before choosing tests or build gates.']
    return {
      title: 'No active plan',
      protectedContext: false,
      checks,
      markdown: [
        '# Red-Team Patch Plan',
        '',
        'Verdict: Open a note to red-team the plan.',
        '',
        '## Findings',
        '- [ ] Select a plan, note, or issue before creating a patch plan.',
        '',
        '## Verification',
        ...checks.map((check) => `- [ ] ${check}`),
      ].join('\n'),
    }
  }

  const safeSignals = review.signals.map(safeSignalSummary).filter((item) => item !== null)
  const checks = verificationChecks(review)

  return {
    title: 'Red-Team Patch Plan',
    protectedContext: review.protectedContext,
    checks,
    markdown: [
      '# Red-Team Patch Plan',
      '',
      `Verdict: ${safeVerdictFor(review)}`,
      localityLine(review.protectedContext),
      '',
      '## Findings',
      ...safeSignals.map((signal) => `- [ ] ${signal.label}: ${signal.nextAction} (${signal.severity})`),
      '',
      '## Signals',
      ...safeSignals.map((signal) => `- ${signal.label}: ${signal.finding}`),
      '',
      '## Verification',
      ...checks.map((check) => `- [ ] ${check}`),
    ].join('\n'),
  }
}

function localityLine(protectedContext: boolean): string {
  if (protectedContext) {
    return 'Privacy: Protected context; content stayed local. No title, path, excerpt, or raw note text is included.'
  }
  return 'Privacy: Source-safe summary only. No title, path, excerpt, or raw note text is included.'
}

function verificationChecks(review: RedTeamPlanReview): string[] {
  const checks = ['Re-check Locality Firewall before any agent, export, or sync handoff.']
  if (review.counts.openTasks > 0) {
    checks.push('Confirm the next three open tasks are scoped before execution.')
  }
  if (review.signals.some((signal) => signal.dimension === 'ux' && signal.severity !== 'clear')) {
    checks.push('Verify the named UI surface with keyboard, contrast, and reduced-motion states.')
  }
  if (review.signals.some((signal) => signal.dimension === 'evidence' && signal.severity !== 'clear')) {
    checks.push('Add the exact tests, build, or manual QA evidence before marking done.')
  } else {
    checks.push('Run the named tests/build gates and attach the evidence to the task.')
  }
  return checks
}

function safeSignalSummary(signal: RedTeamSignal): RedTeamSignal | null {
  if (!isKnownDimension(signal.dimension)) return null
  const severity = isKnownSeverity(signal.severity) ? signal.severity : 'watch'
  const copy = SAFE_SIGNAL_COPY[signal.dimension]
  return {
    dimension: signal.dimension,
    label: copy.label,
    severity,
    finding: copy.finding[severity],
    nextAction: copy.nextAction[severity],
  }
}

function safeVerdictFor(review: RedTeamPlanReview): string {
  const riskCount = review.signals.filter((item) => item.severity === 'risk').length
  if (review.counts.words === 0) return 'No body loaded; critique is metadata-only.'
  if (riskCount >= 3) return 'Not ready yet. Tighten scope, evidence, and user flow first.'
  if (riskCount > 0) return 'Promising, but one sharp risk needs work before execution.'
  return 'Plan is ready for a focused execution pass.'
}

function isKnownDimension(value: string): value is RedTeamDimension {
  return value in SAFE_SIGNAL_COPY
}

function isKnownSeverity(value: string): value is RedTeamSeverity {
  return value === 'clear' || value === 'watch' || value === 'risk'
}

const SAFE_SIGNAL_COPY: Record<
  RedTeamDimension,
  {
    label: string
    finding: Record<RedTeamSeverity, string>
    nextAction: Record<RedTeamSeverity, string>
  }
> = {
  product: {
    label: 'Product',
    finding: {
      clear: 'Outcome and user value are visible.',
      watch: 'The plan has partial product shape, but one product proof is thin.',
      risk: 'The plan can drift because user value or acceptance criteria are thin.',
    },
    nextAction: {
      clear: 'Keep the acceptance line close to the task.',
      watch: 'Add one user-facing outcome and one done condition.',
      risk: 'Add one user-facing outcome and one done condition.',
    },
  },
  code: {
    label: 'Code',
    finding: {
      clear: 'Implementation surface and boundary are named.',
      watch: 'The code surface is visible, but the contract boundary is thin.',
      risk: 'The implementation path is not concrete enough yet.',
    },
    nextAction: {
      clear: 'Keep the contract and regression close to the patch.',
      watch: 'Name the interface, failure mode, and regression test.',
      risk: 'Name the module, command, or component that must change.',
    },
  },
  execution: {
    label: 'Execution',
    finding: {
      clear: 'There is a concrete next-action shape.',
      watch: 'The plan needs a sharper next move.',
      risk: 'Too many open tasks compete for attention.',
    },
    nextAction: {
      clear: 'Keep one visible owner or next step.',
      watch: 'Add the next action, owner, and verification command.',
      risk: 'Pick the next three tasks and park the rest.',
    },
  },
  ux: {
    label: 'UX',
    finding: {
      clear: 'The surface and accessibility path are both named.',
      watch: 'The user-facing path needs one more state or accessibility proof.',
      risk: 'The user-facing path is not concrete enough yet.',
    },
    nextAction: {
      clear: 'Keep the interaction state visible.',
      watch: 'Name the exact surface, state, and accessibility expectation.',
      risk: 'Name the exact surface, state, and accessibility expectation.',
    },
  },
  privacy: {
    label: 'Privacy',
    finding: {
      clear: 'No obvious egress hole is visible in the plan.',
      watch: 'Locality policy should stay explicit before any handoff.',
      risk: 'Egress is mentioned without a visible locality rule.',
    },
    nextAction: {
      clear: 'Keep local-first defaults explicit.',
      watch: 'Show what can leave, what is withheld, and who approves it.',
      risk: 'Add what can leave, what is withheld, and who approves it.',
    },
  },
  evidence: {
    label: 'Evidence',
    finding: {
      clear: 'Verification is named in the plan.',
      watch: 'Verification exists, but the proof target should be clearer.',
      risk: 'The plan does not say how truth will be proven.',
    },
    nextAction: {
      clear: 'Tie each gate to the user flow it protects.',
      watch: 'Add the exact tests, build, or manual QA evidence required.',
      risk: 'Add the exact tests, build, or manual QA evidence required.',
    },
  },
}
