/**
 * Parallel multi-agent ("council") execution and synthesis.
 *
 * The existing Agent Council surfaces only visualize per-agent *readiness*.
 * This module is the missing brain: it runs several AI agents against the same
 * prompt concurrently, collects each answer (tolerating partial failure), and
 * synthesizes them into one reviewable document — the core of Grimoire's
 * 2-LLM workflow.
 *
 * It is deliberately transport-agnostic: callers pass a `runOne` function that
 * drives whatever stream/CLI an agent uses, so this logic stays unit-testable
 * without spawning real agents.
 */
import { AI_AGENT_DEFINITIONS, type AiAgentId } from './aiAgents'

/** Outcome of a single agent within a council run. */
export type CouncilAgentStatus = 'completed' | 'failed' | 'empty'

export interface CouncilAgentResult {
  agentId: AiAgentId
  status: CouncilAgentStatus
  /** The agent's full answer text (empty for failed/empty outcomes). */
  text: string
  /** Failure reason when status is `failed`. */
  error?: string
}

export interface CouncilRunResult {
  /** Per-agent results, in the (de-duplicated) order the agents were requested. */
  results: CouncilAgentResult[]
  completedCount: number
  failedCount: number
  emptyCount: number
}

/**
 * Runs a single agent against the shared prompt and resolves with its full
 * answer text. Throwing/rejecting marks that agent failed without affecting the
 * others.
 */
export type RunCouncilAgent = (agentId: AiAgentId) => Promise<string>

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  if (typeof reason === 'string') return reason
  return 'Unknown error'
}

function agentLabel(agentId: AiAgentId): string {
  return AI_AGENT_DEFINITIONS.find((definition) => definition.id === agentId)?.label ?? agentId
}

/**
 * Runs every requested agent concurrently and collects their results. Duplicate
 * agent ids are de-duplicated. One agent failing never blocks the rest — the
 * run always resolves with a result for each agent.
 */
export async function runAgentCouncil(
  agentIds: readonly AiAgentId[],
  runOne: RunCouncilAgent,
): Promise<CouncilRunResult> {
  const uniqueAgents = [...new Set(agentIds)]
  const settled = await Promise.allSettled(uniqueAgents.map((agentId) => runOne(agentId)))

  const results: CouncilAgentResult[] = settled.map((outcome, index) => {
    const agentId = uniqueAgents[index]
    if (outcome.status === 'rejected') {
      return { agentId, status: 'failed', text: '', error: errorMessage(outcome.reason) }
    }
    const text = (outcome.value ?? '').trim()
    return { agentId, status: text ? 'completed' : 'empty', text }
  })

  return {
    results,
    completedCount: results.filter((result) => result.status === 'completed').length,
    failedCount: results.filter((result) => result.status === 'failed').length,
    emptyCount: results.filter((result) => result.status === 'empty').length,
  }
}

/** Normalize answer text for agreement comparison (whitespace-insensitive). */
function normalizeAnswer(text: string): string {
  return text.replace(/\s+/gu, ' ').trim().toLowerCase()
}

/**
 * Synthesizes a council run into one Markdown document: each agent's answer as
 * a labeled section, an agreement/divergence note across the answers, and a
 * footer recording any agent that failed or returned nothing.
 */
export function synthesizeAgentCouncil(run: CouncilRunResult, prompt?: string): string {
  const completed = run.results.filter((result) => result.status === 'completed')
  const lines: string[] = []

  lines.push('# Council synthesis')
  if (prompt && prompt.trim()) {
    lines.push('', `**Prompt:** ${prompt.trim()}`)
  }

  if (completed.length === 0) {
    lines.push('', 'No agent produced an answer.')
  } else {
    for (const result of completed) {
      lines.push('', `## ${agentLabel(result.agentId)}`, '', result.text)
    }

    if (completed.length > 1) {
      const distinct = new Set(completed.map((result) => normalizeAnswer(result.text)))
      lines.push('', '## Where they land')
      lines.push(
        '',
        distinct.size === 1
          ? `All ${completed.length} agents converged on the same answer.`
          : `The ${completed.length} agents diverged — compare their sections above before accepting.`,
      )
    }
  }

  const unfinished = run.results.filter((result) => result.status !== 'completed')
  if (unfinished.length > 0) {
    lines.push('', '## Not counted')
    for (const result of unfinished) {
      const reason =
        result.status === 'failed' ? `failed — ${result.error ?? 'unknown error'}` : 'returned no answer'
      lines.push(`- ${agentLabel(result.agentId)}: ${reason}`)
    }
  }

  return lines.join('\n')
}
