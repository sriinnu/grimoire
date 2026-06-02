export type AiAgentId = 'claude_code' | 'codex' | 'chitragupta'

export type AiAgentStatus = 'checking' | 'installed' | 'missing'

export interface AiAgentAvailability {
  status: AiAgentStatus
  version: string | null
  detail?: string | null
}

export interface AiAgentsStatus {
  claude_code: AiAgentAvailability
  codex: AiAgentAvailability
  chitragupta: AiAgentAvailability
}

export interface AiAgentDefinition {
  id: AiAgentId
  label: string
  shortLabel: string
  installUrl: string
}

export interface AiAgentRuntimeRoute {
  agent: AiAgentId
  provider: string | null
  model: string | null
  source: 'configured' | 'cli-default' | 'stream'
}

export const DEFAULT_AI_AGENT: AiAgentId = 'claude_code'
export const BROWSER_PREVIEW_AI_STATUS_REASON = 'Open the native Grimoire app for live AI.'
export const AI_AGENTS_STATUS_SCAN_FAILED_DETAIL =
  'Local CLI scan failed. Check again after the native app finishes launching.'
export const AI_AGENT_CLI_DEFAULT_ROUTE = 'resolved by stream'
export const CHITRAGUPTA_CLI_MCP_BOUNDARY =
  'Chitragupta chat uses the local CLI route. MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.'
export const CHITRAGUPTA_MCP_REQUIRED_SURFACES = [
  'memory search',
  'recall',
  'wiki',
  'graph',
  'ingest',
  'diagnostics',
  'write suggestions',
] as const
export const CHITRAGUPTA_MCP_READINESS_COPY =
  'Live memory lanes stay local-ledger only until Chitragupta MCP reports recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions ready.'
export const CHITRAGUPTA_MCP_TRANSPORT_COPY =
  'If the MCP transport closes, Grimoire keeps chat separate and blocks live memory actions until recall, wiki, graph, and diagnostics reconnect.'

export const AI_AGENT_DEFINITIONS: readonly AiAgentDefinition[] = [
  {
    id: 'claude_code',
    label: 'Claude Code',
    shortLabel: 'Claude',
    installUrl: 'https://docs.anthropic.com/en/docs/claude-code',
  },
  {
    id: 'codex',
    label: 'Codex',
    shortLabel: 'Codex',
    installUrl: 'https://developers.openai.com/codex/cli',
  },
  {
    id: 'chitragupta',
    label: 'Chitragupta',
    shortLabel: 'Chitra',
    installUrl: 'https://github.com/sriinnu/chitragupta',
  },
] as const

export function createAiAgentAvailability(status: AiAgentStatus = 'checking', version: string | null = null, detail?: string | null): AiAgentAvailability {
  const trimmedDetail = detail?.trim()
  if (trimmedDetail) return { status, version, detail: trimmedDetail }
  return { status, version }
}

export function createCheckingAiAgentsStatus(): AiAgentsStatus {
  return {
    claude_code: createAiAgentAvailability(),
    codex: createAiAgentAvailability(),
    chitragupta: createAiAgentAvailability(),
  }
}

export function createMissingAiAgentsStatus(): AiAgentsStatus {
  return {
    claude_code: createAiAgentAvailability('missing'),
    codex: createAiAgentAvailability('missing'),
    chitragupta: createAiAgentAvailability('missing'),
  }
}

export function createBrowserPreviewAiAgentsStatus(): AiAgentsStatus {
  return {
    claude_code: createAiAgentAvailability('missing', BROWSER_PREVIEW_AI_STATUS_REASON),
    codex: createAiAgentAvailability('missing', BROWSER_PREVIEW_AI_STATUS_REASON),
    chitragupta: createAiAgentAvailability('missing', BROWSER_PREVIEW_AI_STATUS_REASON),
  }
}

export function createScanFailedAiAgentsStatus(): AiAgentsStatus {
  return {
    claude_code: createAiAgentAvailability('missing', null, AI_AGENTS_STATUS_SCAN_FAILED_DETAIL),
    codex: createAiAgentAvailability('missing', null, AI_AGENTS_STATUS_SCAN_FAILED_DETAIL),
    chitragupta: createAiAgentAvailability('missing', null, AI_AGENTS_STATUS_SCAN_FAILED_DETAIL),
  }
}

export function isBrowserPreviewAiAgentsStatus(statuses: AiAgentsStatus): boolean {
  return AI_AGENT_DEFINITIONS.every((definition) => {
    const status = statuses[definition.id]
    return status.status === 'missing' && status.version === BROWSER_PREVIEW_AI_STATUS_REASON
  })
}

export function isAiAgentsStatusScanFailed(statuses: AiAgentsStatus): boolean {
  return AI_AGENT_DEFINITIONS.every((definition) => {
    const status = statuses[definition.id]
    return status.status === 'missing' && status.detail === AI_AGENTS_STATUS_SCAN_FAILED_DETAIL
  })
}

export function normalizeStoredAiAgent(value: string | null | undefined): AiAgentId | null {
  if (value === 'claude_code' || value === 'codex' || value === 'chitragupta') return value
  return null
}

export function resolveDefaultAiAgent(value: string | null | undefined): AiAgentId {
  return normalizeStoredAiAgent(value) ?? DEFAULT_AI_AGENT
}

export function resolveUsableDefaultAiAgent(
  value: string | null | undefined,
  statuses: AiAgentsStatus,
): AiAgentId {
  const storedAgent = normalizeStoredAiAgent(value)
  if (storedAgent && isAiAgentInstalled(statuses, storedAgent)) return storedAgent

  const fallbackAgent = AI_AGENT_DEFINITIONS.find((definition) => (
    isAiAgentInstalled(statuses, definition.id)
  ))

  return fallbackAgent?.id ?? resolveDefaultAiAgent(value)
}

export function supportsAiAgentProviderRoute(agent: AiAgentId): boolean {
  return agent === 'chitragupta'
}

export function resolveDefaultAiProvider(agent: AiAgentId, value: string | null | undefined): string | null {
  if (!supportsAiAgentProviderRoute(agent)) return null

  const provider = value?.trim()
  if (provider) return provider
  return null
}

export function describeAiAgentRoute(
  agent: AiAgentId,
  provider: string | null | undefined,
  model: string | null | undefined,
): string | null {
  const trimmedProvider = provider?.trim()
  const trimmedModel = model?.trim()
  const parts: string[] = []

  if (agent === 'chitragupta') {
    parts.push(`provider: ${trimmedProvider || AI_AGENT_CLI_DEFAULT_ROUTE}`)
    parts.push(`model: ${trimmedModel || AI_AGENT_CLI_DEFAULT_ROUTE}`)
  } else if (trimmedModel) {
    parts.push(`model: ${trimmedModel}`)
  }

  return parts.length > 0 ? parts.join(' · ') : null
}

export function createRuntimeRouteDisclosure({
  agent,
  provider,
  model,
}: {
  agent: AiAgentId
  provider?: string | null
  model?: string | null
}): AiAgentRuntimeRoute {
  const trimmedProvider = supportsAiAgentProviderRoute(agent) ? provider?.trim() : null
  const trimmedModel = model?.trim()
  return {
    agent,
    provider: trimmedProvider || (agent === 'chitragupta' ? AI_AGENT_CLI_DEFAULT_ROUTE : null),
    model: trimmedModel || (agent === 'chitragupta' ? AI_AGENT_CLI_DEFAULT_ROUTE : null),
    source: trimmedProvider || trimmedModel ? 'configured' : 'cli-default',
  }
}

export function createStreamRuntimeRouteDisclosure({
  agent,
  provider,
  model,
}: {
  agent: AiAgentId
  provider?: string | null
  model?: string | null
}): AiAgentRuntimeRoute {
  return {
    agent,
    provider: provider?.trim() || null,
    model: model?.trim() || null,
    source: 'stream',
  }
}

export function getAiAgentDefinition(agent: AiAgentId): AiAgentDefinition {
  return AI_AGENT_DEFINITIONS.find((definition) => definition.id === agent) ?? AI_AGENT_DEFINITIONS[0]
}

function normalizeAvailability(agent: { installed?: boolean | null; version?: string | null; detail?: string | null } | null | undefined): AiAgentAvailability {
  if (agent?.installed) {
    return createAiAgentAvailability('installed', agent.version ?? null, agent.detail)
  }

  return createAiAgentAvailability('missing', agent?.version ?? null, agent?.detail)
}

export function normalizeAiAgentsStatus(payload: Partial<Record<AiAgentId, { installed?: boolean | null; version?: string | null; detail?: string | null }>> | null | undefined): AiAgentsStatus {
  return {
    claude_code: normalizeAvailability(payload?.claude_code),
    codex: normalizeAvailability(payload?.codex),
    chitragupta: normalizeAvailability(payload?.chitragupta),
  }
}

export function isAiAgentsStatusChecking(statuses: AiAgentsStatus): boolean {
  return AI_AGENT_DEFINITIONS.some((definition) => statuses[definition.id].status === 'checking')
}

export function isAiAgentInstalled(statuses: AiAgentsStatus, agent: AiAgentId): boolean {
  return statuses[agent].status === 'installed'
}

export function hasAnyInstalledAiAgent(statuses: AiAgentsStatus): boolean {
  return AI_AGENT_DEFINITIONS.some((definition) => isAiAgentInstalled(statuses, definition.id))
}

export function getNextAiAgentId(current: AiAgentId): AiAgentId {
  const currentIndex = AI_AGENT_DEFINITIONS.findIndex((definition) => definition.id === current)
  if (currentIndex < 0) return DEFAULT_AI_AGENT
  return AI_AGENT_DEFINITIONS[(currentIndex + 1) % AI_AGENT_DEFINITIONS.length].id
}
