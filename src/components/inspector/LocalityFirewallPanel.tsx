import { Bot, CloudOff, GitBranch, ShieldAlert } from 'lucide-react'
import { Glyph } from '@/components/glyphs/Glyph'
import type { ReactNode } from 'react'
import type { VaultEntry } from '../../types'
import {
  entryLocalityEgressLanes,
  resolveEntryLocalityPolicy,
  type LocalityEgressLane,
} from '../../lib/localityPolicy'
import { Badge } from '../ui/badge'

interface LocalityFirewallPanelProps {
  entry: VaultEntry
}

/** Shows the active note's egress policy before agents, export, sync, or Git flows touch it. */
export function LocalityFirewallPanel({ entry }: LocalityFirewallPanelProps) {
  const policy = resolveEntryLocalityPolicy(entry)
  const badge = policy.localOnly ? 'Protected local' : 'Vault context'
  const description = policy.localOnly
    ? 'No title, path, body, or frontmatter leaves through agent, export, sync, or Git flows by default.'
    : 'This note can be included in source-safe packets and portable exports when the action preview allows it.'
  const lanes = entryLocalityEgressLanes(policy)

  return (
    <section
      className="inspector-card grimoire-locality-firewall"
      data-locality={policy.localOnly ? 'local-only' : 'source-safe'}
      data-testid="note-locality-firewall"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          {policy.localOnly ? <ShieldAlert className="size-3" /> : <Glyph name="shield" size={12} className="size-3" />}
          Firewall
        </h4>
        <Badge variant={policy.localOnly ? 'outline' : 'secondary'} className="h-5 rounded-md px-1.5 text-[10px]">
          {badge}
        </Badge>
      </div>

      <div className="grimoire-locality-firewall__summary mb-2 rounded-md border px-2 py-2 text-[12px] leading-relaxed">
        <span className="font-medium text-foreground">{policy.reason}.</span>
        <span> {description}</span>
      </div>

      <div className="grid gap-1.5">
        {lanes.map((lane) => (
          <FirewallLaneRow key={lane.label} lane={lane} />
        ))}
      </div>
    </section>
  )
}

function FirewallLaneRow({ lane }: { lane: LocalityEgressLane }) {
  return (
    <div
      className="grimoire-locality-firewall__lane grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2 rounded-md px-2 py-1.5 text-[11px]"
      data-egress-state={lane.stateKey}
    >
      <span className="grimoire-locality-firewall__lane-icon mt-0.5">{laneIcon(lane.id)}</span>
      <span className="min-w-0">
        <span className="grimoire-locality-firewall__lane-label block font-medium">{lane.label}</span>
        <span className="grimoire-locality-firewall__lane-detail block truncate">{lane.detail}</span>
      </span>
      <Badge variant="outline" className="grimoire-locality-firewall__lane-state rounded-md text-[10px]">
        {lane.state}
      </Badge>
    </div>
  )
}

function laneIcon(id: LocalityEgressLane['id']): ReactNode {
  if (id === 'agents') return <Bot className="size-3" />
  if (id === 'export-sync') return <CloudOff className="size-3" />
  return <GitBranch className="size-3" />
}
