/** Stable ids for private local agent lanes Grimoire can acknowledge without publishing internals. */
export type PrivateAgentLaneId = 'chitragupta' | 'woosh' | 'tring_cli'

/** Public metadata allowed to cross from private local agent lanes into Grimoire UI/docs. */
export interface PrivateAgentLane {
  id: PrivateAgentLaneId
  label: string
  role: string
  commands: string[]
  privacy: 'private-local'
  crossesVaultBoundaryByDefault: false
  publicSurface: 'health-permissions-outputs'
}

const PRIVATE_AGENT_LANES: readonly PrivateAgentLane[] = [
  {
    id: 'chitragupta',
    label: 'Chitragupta',
    role: 'Local memory, recall, wiki, graph, diagnostics, and model-routing lane.',
    commands: ['chitragupta', 'chitragupta-daemon'],
    privacy: 'private-local',
    crossesVaultBoundaryByDefault: false,
    publicSurface: 'health-permissions-outputs',
  },
  {
    id: 'woosh',
    label: 'Woosh',
    role: 'Private relay/communication lane exposed only through capability health and user-approved outputs.',
    commands: ['woosh'],
    privacy: 'private-local',
    crossesVaultBoundaryByDefault: false,
    publicSurface: 'health-permissions-outputs',
  },
  {
    id: 'tring_cli',
    label: 'Tring CLI',
    role: 'Private messaging/capture lane exposed only through capability health and user-approved outputs.',
    commands: ['tring', 'tring-cli'],
    privacy: 'private-local',
    crossesVaultBoundaryByDefault: false,
    publicSurface: 'health-permissions-outputs',
  },
]

/** Lists private local agent lanes without exposing repo paths, prompts, credentials, or internal configs. */
export function listPrivateAgentLanes(): readonly PrivateAgentLane[] {
  return PRIVATE_AGENT_LANES
}

/** Resolves a private local agent lane by stable id. */
export function getPrivateAgentLane(id: PrivateAgentLaneId): PrivateAgentLane {
  const lane = PRIVATE_AGENT_LANES.find((candidate) => candidate.id === id)
  if (!lane) throw new Error(`Unknown private agent lane: ${id}`)
  return lane
}
