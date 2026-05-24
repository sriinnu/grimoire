import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import type { RedTeamPlanReview } from './redTeamPlan'
import { buildRedTeamPlanReview } from './redTeamPlan'
import { buildRedTeamPatchPlan } from './redTeamPatchPlan'

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/plans/secret-plan.md',
    filename: 'secret-plan.md',
    title: 'Secret Plan',
    isA: 'Plan',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: 1700000000,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('buildRedTeamPlanReview', () => {
  it('flags missing product, code, UX, privacy, and evidence shape without returning note text', () => {
    const review = buildRedTeamPlanReview({
      activeEntry: entry(),
      activeNoteContent: 'Send the secret archive to S3 tomorrow.',
    })

    expect(review.state).toBe('ready')
    expect(review.verdict).toContain('Not ready')
    expect(review.signals.filter((signal) => signal.severity === 'risk').map((signal) => signal.dimension))
      .toEqual(['product', 'code', 'ux', 'privacy', 'evidence'])
    expect(JSON.stringify(review)).not.toContain('secret archive')
    expect(JSON.stringify(review)).not.toContain('/vault/plans/secret-plan.md')
  })

  it('counts tasks and protects local-only context labels', () => {
    const review = buildRedTeamPlanReview({
      activeEntry: entry({ title: 'Hidden Therapy Plan', path: '/vault/private/hidden-therapy-plan.md' }),
      activeNoteContent: [
        '# Therapy Plan',
        'User workflow target and acceptance criteria.',
        '- [ ] Test the dashboard flow.',
        '- [x] Build the first draft.',
      ].join('\n'),
    })

    expect(review.protectedContext).toBe(true)
    expect(review.protectedReason).toContain('private')
    expect(review.counts).toMatchObject({ headings: 1, openTasks: 1, completedTasks: 1 })
    expect(review.signals.find((signal) => signal.dimension === 'privacy')).toMatchObject({
      severity: 'clear',
    })
    expect(JSON.stringify(review)).not.toContain('Hidden Therapy Plan')
    expect(JSON.stringify(review)).not.toContain('/vault/private')
  })

  it('marks a verified and scoped plan ready', () => {
    const review = buildRedTeamPlanReview({
      activeEntry: entry({ properties: { locality: 'local' } }),
      activeNoteContent: [
        '# Dashboard Flow',
        'User workflow goal: open app, capture, verify, and leave with cleaner memory.',
        'Component: VaultDashboard module with a typed locality contract and regression coverage.',
        'Acceptance: Settings and dashboard states are visible with keyboard accessibility.',
        '- [ ] Next action: ship tests and build green.',
        'Verification: vitest, lint, build, and Playwright smoke.',
      ].join('\n'),
    })

    expect(review.verdict).toBe('Plan is ready for a focused execution pass.')
    expect(review.signals.every((signal) => signal.severity === 'clear')).toBe(true)
  })
})

describe('buildRedTeamPatchPlan', () => {
  it('creates a reviewable Markdown checklist without leaking protected note details', () => {
    const review = buildRedTeamPlanReview({
      activeEntry: entry({
        title: 'Hidden Therapy Plan',
        path: '/vault/private/hidden-therapy-plan.md',
      }),
      activeNoteContent: 'Send the secret archive to S3 tomorrow.',
    })

    const plan = buildRedTeamPatchPlan(review)

    expect(plan.title).toBe('Red-Team Patch Plan')
    expect(plan.protectedContext).toBe(true)
    expect(plan.markdown).toContain('# Red-Team Patch Plan')
    expect(plan.markdown).toContain('Protected context; content stayed local')
    expect(plan.markdown).toContain('- [ ] Product: Add one user-facing outcome and one done condition.')
    expect(plan.markdown).toContain('- [ ] Code: Name the module, command, or component that must change.')
    expect(plan.markdown).toContain('- [ ] Re-check Locality Firewall before any agent, export, or sync handoff.')
    expect(plan.markdown).not.toContain('Hidden Therapy Plan')
    expect(plan.markdown).not.toContain('/vault/private')
    expect(plan.markdown).not.toContain('secret archive')
    expect(plan.markdown).not.toContain('S3 tomorrow')
  })

  it('returns a no-active-plan preview when there is no active note', () => {
    const plan = buildRedTeamPatchPlan(buildRedTeamPlanReview({ activeEntry: null }))

    expect(plan.title).toBe('No active plan')
    expect(plan.markdown).toContain('Open a note to red-team the plan.')
    expect(plan.markdown).toContain('- [ ] Select a plan, note, or issue before creating a patch plan.')
    expect(plan.markdown).toContain('Open a note, plan, or issue before choosing tests or build gates.')
  })

  it('does not echo arbitrary review strings into the Markdown preview', () => {
    const review: RedTeamPlanReview = {
      state: 'ready',
      verdict: 'Secret verdict should not leak',
      protectedContext: true,
      protectedReason: 'Secret protected reason',
      counts: { words: 9, headings: 0, openTasks: 0, completedTasks: 0 },
      signals: [{
        dimension: 'product',
        label: 'Secret Label',
        severity: 'risk',
        finding: 'Secret finding from raw note',
        nextAction: 'Secret next action from raw note',
      }],
    }

    const plan = buildRedTeamPatchPlan(review)

    expect(plan.markdown).toContain('Add one user-facing outcome and one done condition.')
    expect(plan.markdown).not.toContain('Secret verdict')
    expect(plan.markdown).not.toContain('Secret Label')
    expect(plan.markdown).not.toContain('Secret finding')
    expect(plan.markdown).not.toContain('Secret next action')
    expect(plan.markdown).not.toContain('Secret protected reason')
  })
})
