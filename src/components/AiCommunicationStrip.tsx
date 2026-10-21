import { Cpu, ShieldCheck } from 'lucide-react'
import {
  describeAiAgentRoute,
  getAiAgentDefinition,
  type AiAgentAvailability,
  type AiAgentId,
} from '../lib/aiAgents'
import type { AgentStatus } from '../hooks/useAiAgent'
import './ai-communication.css'

export interface AiCommunicationStripProps {
  agent: AiAgentId
  provider?: string | null
  model?: string | null
  availability: AiAgentAvailability | null
  agentStatus: AgentStatus
}

type OrbState = 'live' | 'checking' | 'tool' | 'error'

function resolveOrbState(availability: AiAgentAvailability | null, agentStatus: AgentStatus): OrbState {
  if (agentStatus === 'error' || availability?.status === 'missing') return 'error'
  if (agentStatus === 'thinking' || availability?.status === 'checking') return 'checking'
  if (agentStatus === 'tool-executing') return 'tool'
  return 'live'
}

function statusLineParts(
  availability: AiAgentAvailability | null,
  agentStatus: AgentStatus,
): string[] {
  const parts: string[] = []
  if (availability?.version) parts.push(`daemon v${availability.version}`)
  if (availability?.status === 'missing') parts.push('CLI missing')
  else if (availability?.status === 'checking') parts.push('checking CLI')
  if (agentStatus === 'thinking') parts.push('thinking')
  else if (agentStatus === 'tool-executing') parts.push('executing tools')
  else if (agentStatus === 'error') parts.push('error')
  return parts
}

/**
 * Chitragupta communication strip: route disclosure with a live daemon orb
 * plus a slim mono status line — real availability + agent status only.
 * The "Nothing leaves this machine" claim renders only for the local CLI
 * route (no remote provider/model configured).
 */
export function AiCommunicationStrip({
  agent,
  provider,
  model,
  availability,
  agentStatus,
}: AiCommunicationStripProps) {
  const agentLabel = getAiAgentDefinition(agent).shortLabel
  const routeLabel = describeAiAgentRoute(agent, provider, model)
  const orbState = resolveOrbState(availability, agentStatus)
  const isLocalRoute = !provider?.trim() && !model?.trim()
  const statusParts = statusLineParts(availability, agentStatus)

  return (
    <div className="aic-strip aic-tone-teal" data-testid="ai-communication-strip">
      <span className="aic-chip aic-chip--route">
        <span className={`aic-chip__orb aic-chip__orb--${orbState}`} aria-hidden="true" />
        <span className="aic-chip__label">
          via {agentLabel}
          {routeLabel ? ` · ${routeLabel}` : ' · local route'}
        </span>
      </span>
      {isLocalRoute && (
        <span className="aic-chip">
          <ShieldCheck size={11} />
          Nothing leaves this machine
        </span>
      )}
      {!isLocalRoute && (
        <span className="aic-chip">
          <Cpu size={11} />
          {provider?.trim() || 'remote provider'}
        </span>
      )}
      {statusParts.length > 0 && (
        <span className="aic-statusline" aria-live="polite">
          {statusParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </span>
      )}
    </div>
  )
}
