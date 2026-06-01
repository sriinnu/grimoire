import { ShieldCheck, Workflow } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  describeAiAgentRoute,
  getAiAgentDefinition,
  type AiAgentAvailability,
  type AiAgentId,
} from '../lib/aiAgents'
import { Badge } from './ui/badge'

interface AgentRouteDisclosureProps {
  agent: AiAgentId
  availability?: AiAgentAvailability
  className?: string
  contextProtected?: boolean
  model?: string | null
  provider?: string | null
}

/** Shows the active agent provider/model route without attaching note content. */
export function AgentRouteDisclosure({
  agent,
  availability,
  className,
  contextProtected = false,
  model,
  provider,
}: AgentRouteDisclosureProps) {
  const routeLabel = describeAiAgentRoute(agent, provider, model)
  if (!routeLabel && !availability) return null

  const agentLabel = getAiAgentDefinition(agent).shortLabel
  const localityLabel = contextProtected ? 'No note payload' : 'Source-safe packet'

  return (
    <div
      className={cn(
        'grimoire-agent-route flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border border-border bg-background/55 px-2 py-1.5 text-[10px] text-muted-foreground',
        className,
      )}
      data-agent-route={agent}
      data-locality={contextProtected ? 'protected-local' : 'source-safe'}
      data-testid="agent-route-disclosure"
    >
      <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
        <Workflow className="size-3 shrink-0 text-[var(--grimoire-signal-accent)]" />
        <span className="truncate">Route</span>
      </span>
      <Badge variant="outline" className="grimoire-agent-route__chip h-5 shrink-0 rounded-md px-1.5 text-[9px]">
        {agentLabel}
      </Badge>
      <span className="min-w-0 flex-1 truncate">{routeLabel ?? 'CLI default route'}</span>
      <Badge
        variant="outline"
        className="grimoire-agent-route__chip h-5 shrink-0 rounded-md px-1.5 text-[9px]"
      >
        <ShieldCheck className="size-3" />
        {localityLabel}
      </Badge>
      {availability ? (
        <Badge
          variant="outline"
          className="grimoire-agent-route__chip h-5 shrink-0 rounded-md px-1.5 text-[9px]"
        >
          {routeStatusLabel(availability)}
        </Badge>
      ) : null}
    </div>
  )
}

function routeStatusLabel(availability: AiAgentAvailability): string {
  if (availability.status === 'installed') return availability.version ? `CLI ${availability.version}` : 'CLI installed'
  if (availability.status === 'missing') return 'CLI missing'
  return 'CLI checking'
}
