/**
 * useAgentCouncilRun — drive the 2-LLM council from React.
 *
 * Streams several AI agents against the same prompt in parallel, tracks each
 * one's live output, and synthesizes their answers once they all finish. It
 * composes the tested logic core: `collectAgentStream` (callbacks → Promise),
 * `runAgentCouncil` (parallel, failure-isolated), and `synthesizeAgentCouncil`
 * (merged answer). The stream function is injected so the hook is unit-testable
 * without Tauri or real agents; it defaults to the real `streamAiAgent`.
 */
import { useCallback, useRef, useState } from 'react'
import { streamAiAgent } from '../utils/streamAiAgent'
import type { AiAgentId } from '../lib/aiAgents'
import { collectAgentStream } from '../lib/agentCouncilStream'
import {
  runAgentCouncil,
  synthesizeAgentCouncil,
  type CouncilAgentStatus,
} from '../lib/agentCouncilRun'

export type CouncilPhase = 'idle' | 'running' | 'done'

export interface CouncilAgentLiveState {
  /** 'running' while streaming, then the final council outcome. */
  status: 'running' | CouncilAgentStatus
  text: string
  error?: string
}

export interface CouncilRunInput {
  prompt: string
  agentIds: AiAgentId[]
  vaultPath: string
  systemPrompt?: string
  routes?: Partial<Record<AiAgentId, { provider?: string | null; model?: string | null }>>
}

export interface AgentCouncilRun {
  phase: CouncilPhase
  agents: Partial<Record<AiAgentId, CouncilAgentLiveState>>
  synthesis: string | null
  run: (input: CouncilRunInput) => Promise<void>
  reset: () => void
}

export function useAgentCouncilRun(streamAgent: typeof streamAiAgent = streamAiAgent): AgentCouncilRun {
  const [phase, setPhase] = useState<CouncilPhase>('idle')
  const [agents, setAgents] = useState<Partial<Record<AiAgentId, CouncilAgentLiveState>>>({})
  const [synthesis, setSynthesis] = useState<string | null>(null)
  const runningRef = useRef(false)

  const run = useCallback(
    async (input: CouncilRunInput) => {
      if (runningRef.current) return
      const ids = [...new Set(input.agentIds)]
      if (ids.length === 0) return

      runningRef.current = true
      setPhase('running')
      setSynthesis(null)
      const initial: Partial<Record<AiAgentId, CouncilAgentLiveState>> = {}
      for (const id of ids) initial[id] = { status: 'running', text: '' }
      setAgents(initial)

      const runOne = (id: AiAgentId): Promise<string> =>
        collectAgentStream(
          (callbacks) =>
            streamAgent({
              agent: id,
              message: input.prompt,
              systemPrompt: input.systemPrompt,
              vaultPath: input.vaultPath,
              provider: input.routes?.[id]?.provider ?? null,
              model: input.routes?.[id]?.model ?? null,
              callbacks,
            }),
          { onProgress: (text) => setAgents((prev) => ({ ...prev, [id]: { status: 'running', text } })) },
        )

      const result = await runAgentCouncil(ids, runOne)

      const final: Partial<Record<AiAgentId, CouncilAgentLiveState>> = {}
      for (const r of result.results) final[r.agentId] = { status: r.status, text: r.text, error: r.error }
      setAgents(final)
      setSynthesis(synthesizeAgentCouncil(result, input.prompt))
      setPhase('done')
      runningRef.current = false
    },
    [streamAgent],
  )

  const reset = useCallback(() => {
    if (runningRef.current) return
    setPhase('idle')
    setAgents({})
    setSynthesis(null)
  }, [])

  return { phase, agents, synthesis, run, reset }
}
