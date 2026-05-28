import type { AgentCouncilBrief, AgentCouncilMember } from './agentCouncil'
import type { AgentCouncilPassBrief, AgentCouncilWorkflowStep } from './agentCouncilWorkflow'
import { buildRedTeamCouncilActions } from './agentCouncilRedTeam'
import type { RedTeamPlanReview } from './redTeamPlan'

export interface AgentCouncilSynthesisPacket {
  oneAnswer: AgentCouncilOneAnswer
  markdown: string
  preflight: AgentCouncilPreflight
  protectedContext: boolean
  sourceLabels: string[]
  title: string
}

export interface AgentCouncilPreflight {
  gatedLaneCount: number
  heldLocalCount: number
  mode: 'policy-only' | 'review-gated'
  proofBoundaryLaneCount: number
  readyLaneCount: number
  reviewRequired: boolean
  sourceCount: number
  trimmedCount: number
  unavailableLaneCount: number
}

export interface AgentCouncilOneAnswer {
  answer: string
  confidence: 'high' | 'medium' | 'blocked'
  conflictCount: number
  nextStep: string
  sourceCount: number
  title: string
}

interface AgentCouncilSynthesisParams {
  activeContextProtected: boolean
  brief: AgentCouncilBrief
  members: AgentCouncilMember[]
  passBrief: AgentCouncilPassBrief
  redTeamReview?: RedTeamPlanReview | null
  workflow: AgentCouncilWorkflowStep[]
}

/** Builds a source-safe Markdown packet for reviewing the current Agent Council pass. */
export function buildAgentCouncilSynthesisPacket({
  activeContextProtected,
  brief,
  members,
  passBrief,
  redTeamReview,
  workflow,
}: AgentCouncilSynthesisParams): AgentCouncilSynthesisPacket {
  const title = activeContextProtected ? 'Policy-only Council synthesis' : 'Agent Council synthesis'
  const sourceLabels = activeContextProtected ? [] : sourceLabelsForPacket(brief.sourceLabels)
  const sources = sourceSection(sourceLabels)
  const lanes = laneSection(members)
  const friction = frictionSection(brief.disagreements)
  const redTeamActions = redTeamSection(redTeamReview, activeContextProtected)
  const steps = workflowSection(workflow)
  const preflight = buildPreflight({
    activeContextProtected,
    members,
    sourceCount: activeContextProtected ? 0 : sourceLabels.length,
  })
  const oneAnswer = buildAgentCouncilOneAnswer({
    activeContextProtected,
    conflictCount: brief.disagreements.length,
    members,
    sourceCount: activeContextProtected ? 0 : sourceLabels.length,
  })
  return {
    oneAnswer,
    preflight,
    protectedContext: activeContextProtected,
    sourceLabels,
    title,
    markdown: [
      `# ${title}`,
      '',
      `Scope: ${passBrief.scope}`,
      `Deliverable: ${passBrief.deliverable}`,
      `Safety: ${passBrief.safety}`,
      '',
      '## One Answer',
      oneAnswer.answer,
      '',
      `Confidence: ${oneAnswer.confidence}`,
      `Next step: ${oneAnswer.nextStep}`,
      '',
      '## Synthesis',
      brief.synthesis,
      '',
      '## Sources',
      ...sources,
      '',
      '## Lane Stances',
      ...lanes,
      '',
      '## Friction',
      ...friction,
      '',
      '## Handoff Gate',
      ...handoffGateSection(preflight),
      '',
      '## Red-Team Next Actions',
      ...redTeamActions,
      '',
      '## Workflow',
      ...steps,
      '',
      '## Reviewable Next Step',
      '- [ ] Convert the synthesis into a Markdown patch only after human review.',
      '- [ ] Keep protected/local-only content withheld unless the user explicitly approves a local write.',
    ].join('\n'),
  }
}

function buildPreflight({
  activeContextProtected,
  members,
  sourceCount,
}: {
  activeContextProtected: boolean
  members: AgentCouncilMember[]
  sourceCount: number
}): AgentCouncilPreflight {
  const unavailableLaneCount = members.filter((member) => member.health === 'missing' || member.health === 'checking').length
  const gatedLaneCount = members.filter((member) => member.health === 'private-local').length
  const proofBoundaryLaneCount = members.filter((member) => member.id === 'portability_context').length
  const readyLaneCount = members.filter((member) => member.health === 'ready' && member.id !== 'portability_context').length
  return {
    gatedLaneCount,
    heldLocalCount: countHeldLocalSources(members, activeContextProtected),
    mode: activeContextProtected ? 'policy-only' : 'review-gated',
    proofBoundaryLaneCount,
    readyLaneCount,
    reviewRequired: true,
    sourceCount,
    trimmedCount: 0,
    unavailableLaneCount,
  }
}

function countHeldLocalSources(members: AgentCouncilMember[], activeContextProtected: boolean): number {
  if (activeContextProtected) return 1
  const labels = unique(members.flatMap((member) => member.sources)
    .filter((source) => source.kind === 'withheld')
    .map((source) => source.label))
  return labels.reduce((sum, label) => sum + countFromWithheldLabel(label), 0)
}

function countFromWithheldLabel(label: string): number {
  const match = /^(\d+)\s/.exec(label.trim())
  return match ? Number(match[1]) : 1
}

function buildAgentCouncilOneAnswer({
  activeContextProtected,
  conflictCount,
  members,
  sourceCount,
}: {
  activeContextProtected: boolean
  conflictCount: number
  members: AgentCouncilMember[]
  sourceCount: number
}): AgentCouncilOneAnswer {
  if (activeContextProtected) {
    return {
      answer: 'Keep this note local. The Council may compare policies and capability health, but no label, path, body, or frontmatter leaves the vault.',
      confidence: 'blocked',
      conflictCount,
      nextStep: 'Review policy-only guidance, then approve a local write only if you want one.',
      sourceCount: 0,
      title: 'Local-only hold',
    }
  }

  const unavailableCount = members.filter((member) => member.health === 'missing' || member.health === 'checking').length
  const privateCount = members.filter((member) => member.health === 'private-local').length
  const proofBoundaryCount = members.filter((member) => member.id === 'portability_context').length
  const readyCount = members.filter((member) => member.health === 'ready' && member.id !== 'portability_context').length
  const confidence = conflictCount > 0 || unavailableCount > 0 ? 'medium' : 'high'
  const constraints = [
    conflictCount > 0 ? `${conflictCount} friction signal${conflictCount === 1 ? '' : 's'}` : null,
    unavailableCount > 0 ? `${unavailableCount} unavailable lane${unavailableCount === 1 ? '' : 's'}` : null,
    privateCount > 0 ? `${privateCount} private lane${privateCount === 1 ? '' : 's'} approval-gated` : null,
    proofBoundaryCount > 0 ? `${proofBoundaryCount} proof-boundary lane${proofBoundaryCount === 1 ? '' : 's'}` : null,
  ].filter((item): item is string => Boolean(item))
  const constraintCopy = constraints.length > 0 ? ` while respecting ${constraints.join(', ')}` : ''

  return {
    answer: `Stage one reviewable Markdown answer from ${readyCount} ready lane${readyCount === 1 ? '' : 's'} and ${sourceCount} source label${sourceCount === 1 ? '' : 's'}${constraintCopy}.`,
    confidence,
    conflictCount,
    nextStep: 'Open Review synthesis, then Crystallize only after human approval.',
    sourceCount,
    title: confidence === 'high' ? 'Ready to review' : 'Review with guardrails',
  }
}

function sourceLabelsForPacket(labels: string[]): string[] {
  return unique(labels).filter((label) => label !== 'No active note' && !isWithheldCountLabel(label))
}

function sourceSection(safeLabels: string[]): string[] {
  if (safeLabels.length === 0) return ['- No source labels available.']
  return safeLabels.slice(0, 10).map((label) => `- ${label}`)
}

function laneSection(members: AgentCouncilMember[]): string[] {
  return members.map((member) => {
    const sources = unique(member.sources.map(safeLaneSourceLabel)).slice(0, 4).join(', ')
    const sourceCopy = sources ? ` Sources: ${sources}.` : ''
    const evidenceLimit = member.id === 'portability_context' ? 4 : 3
    const evidence = member.evidence
      .slice(0, evidenceLimit)
      .map((item) => `${item.label} - ${item.detail}`)
      .join('; ')
    const evidenceCopy = evidence ? ` Evidence: ${evidence}.` : ''
    const claim = member.claims[0]
    const claimCopy = claim
      ? ` Claim: ${claim.confidence} confidence, ${countLabel(claim.sourceLabels.length, 'source')}${claim.conflictsWith.length > 0 ? `, ${countLabel(claim.conflictsWith.length, 'conflict')}` : ''}.`
      : ''
    return `- ${member.label}: ${member.stance} ${member.contribution}${claimCopy}${sourceCopy}${evidenceCopy}`
  })
}

function safeLaneSourceLabel(source: AgentCouncilMember['sources'][number]): string {
  return source.kind === 'withheld' ? 'Protected context withheld' : source.label
}

function frictionSection(disagreements: string[]): string[] {
  if (disagreements.length === 0) return ['- No friction signals.']
  return disagreements.map((signal) => `- ${signal}`)
}

function redTeamSection(review: RedTeamPlanReview | null | undefined, protectedContext: boolean): string[] {
  const actions = buildRedTeamCouncilActions(review, protectedContext)
  if (actions.length === 0) return ['- No Red Team action required before execution.']
  return actions.map((action) => `- [ ] ${action.label}: ${action.nextAction} (${action.severity})`)
}

function handoffGateSection(preflight: AgentCouncilPreflight): string[] {
  const heldLocal = preflight.heldLocalCount > 0 ? 'yes' : 'no'
  return [
    `- Mode: ${preflight.mode}`,
    `- Ready lanes: ${preflight.readyLaneCount}`,
    `- Proof-boundary lanes: ${preflight.proofBoundaryLaneCount}`,
    `- Approval-gated private lanes: ${preflight.gatedLaneCount}`,
    `- Unavailable lanes: ${preflight.unavailableLaneCount}`,
    `- Held local: ${heldLocal}`,
    `- Review required: ${preflight.reviewRequired ? 'yes' : 'no'}`,
  ]
}

function workflowSection(workflow: AgentCouncilWorkflowStep[]): string[] {
  return workflow.map((step) => `- ${step.label} (${step.status}): ${step.detail}`)
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function isWithheldCountLabel(label: string): boolean {
  return /^\d+\s+(dashboard|graph)\s+items\s+withheld$/i.test(label.trim())
}
