/**
 * Bridge between Grimoire's callback-based agent streaming and the council
 * orchestrator's `runOne` contract.
 *
 * `runAgentCouncil` (agentCouncilRun.ts) needs each agent expressed as
 * `(agentId) => Promise<string>` — resolve with the full answer, reject on
 * failure. But the agent streams (e.g. `streamClaudeAgent`) deliver incremental
 * `onText` deltas and signal completion via `onDone`/`onError` callbacks. This
 * adapter accumulates the deltas and settles a Promise so the streaming API
 * slots straight into the council run, while staying unit-testable without
 * Tauri or a real agent.
 */
import type { AgentStreamCallbacks } from '../utils/ai-agent'
import type { AiAgentId } from './aiAgents'
import type { RunCouncilAgent } from './agentCouncilRun'

/** Drives one agent's stream, invoking the supplied callbacks as events arrive. */
export type AgentStreamDriver = (callbacks: AgentStreamCallbacks) => void | Promise<void>

/** Options for {@link collectAgentStream}. */
export interface CollectAgentStreamOptions {
  /** Called on every text delta with the answer accumulated so far — for live
   *  per-agent UI while the council streams. */
  onProgress?: (fullText: string) => void
}

/**
 * Runs a streaming agent driver and resolves with the accumulated answer text
 * once it completes. The first `onError` rejects (and wins over a trailing
 * `onDone`, which agent streams emit after errors); a driver that throws or
 * whose Promise rejects also rejects. Thinking and tool-call callbacks are
 * ignored — only `onText` contributes to the answer.
 */
export function collectAgentStream(
  drive: AgentStreamDriver,
  options?: CollectAgentStreamOptions,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let answer = ''
    let settled = false

    const finishOk = (): void => {
      if (settled) return
      settled = true
      resolve(answer)
    }

    const finishErr = (message: string): void => {
      if (settled) return
      settled = true
      reject(new Error(message))
    }

    const callbacks: AgentStreamCallbacks = {
      onText: (text) => {
        answer += text
        options?.onProgress?.(answer)
      },
      onThinking: () => {},
      onToolStart: () => {},
      onToolDone: () => {},
      onError: (message) => finishErr(message),
      onDone: () => finishOk(),
    }

    try {
      const result = drive(callbacks)
      if (result && typeof (result as Promise<void>).then === 'function') {
        ;(result as Promise<void>).catch((error: unknown) =>
          finishErr(error instanceof Error ? error.message : String(error)),
        )
      }
    } catch (error) {
      finishErr(error instanceof Error ? error.message : String(error))
    }
  })
}

/**
 * Builds the `runOne` function for `runAgentCouncil` from per-agent stream
 * drivers. The returned function streams the requested agent and resolves with
 * its full answer; requesting an agent with no driver rejects so the council
 * records it as failed rather than silently dropping it.
 */
export function buildCouncilRunner(
  drivers: Partial<Record<AiAgentId, AgentStreamDriver>>,
): RunCouncilAgent {
  return (agentId) => {
    const driver = drivers[agentId]
    if (!driver) {
      return Promise.reject(new Error(`No stream driver for agent: ${agentId}`))
    }
    return collectAgentStream(driver)
  }
}
