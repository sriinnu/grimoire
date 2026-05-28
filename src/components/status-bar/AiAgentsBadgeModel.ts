import {
  AI_AGENT_DEFINITIONS,
  CHITRAGUPTA_CLI_MCP_BOUNDARY,
  getAiAgentDefinition,
  hasAnyInstalledAiAgent,
  isBrowserPreviewAiAgentsStatus,
  isAiAgentInstalled,
  type AiAgentDefinition,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import {
  getVaultAiGuidanceSummary,
  isVaultAiGuidanceStatusChecking,
  vaultAiGuidanceNeedsRestore,
  vaultAiGuidanceUsesCustomFiles,
  type VaultAiGuidanceStatus,
} from '../../lib/vaultAiGuidance'

/** Builds the tooltip copy for the footer AI agent trigger. */
export function badgeTooltip(
  statuses: AiAgentsStatus,
  defaultAgent: AiAgentId,
  guidanceStatus?: VaultAiGuidanceStatus,
): string {
  if (isBrowserPreviewAiAgentsStatus(statuses)) return 'Live AI requires the native Grimoire app'
  const guidanceSummary = guidanceStatus && !isVaultAiGuidanceStatusChecking(guidanceStatus)
    ? getVaultAiGuidanceSummary(guidanceStatus)
    : null
  if (!hasAnyInstalledAiAgent(statuses)) return 'No AI agents detected — click for setup details'
  const definition = getAiAgentDefinition(defaultAgent)
  if (!isAiAgentInstalled(statuses, defaultAgent)) {
    return `${definition.label} is selected but not installed — click for setup details`
  }
  const version = statuses[defaultAgent].version
  const base = `Default AI agent: ${definition.label}${version ? ` ${version}` : ''}`
  const baseWithRuntime = defaultAgent === 'chitragupta' ? `${base}. ${CHITRAGUPTA_CLI_MCP_BOUNDARY}` : base
  if (!guidanceSummary) return baseWithRuntime
  if (vaultAiGuidanceNeedsRestore(guidanceStatus!)) {
    return `${baseWithRuntime}. ${guidanceSummary} — click for restore details`
  }
  if (vaultAiGuidanceUsesCustomFiles(guidanceStatus!)) return `${baseWithRuntime}. ${guidanceSummary}`
  return baseWithRuntime
}

/** Returns installed local agent definitions for the switcher menu. */
export function installedAgentDefinitions(statuses: AiAgentsStatus): AiAgentDefinition[] {
  return AI_AGENT_DEFINITIONS.filter((definition) => isAiAgentInstalled(statuses, definition.id))
}

/** Returns missing local agent definitions for setup links. */
export function missingAgentDefinitions(statuses: AiAgentsStatus): AiAgentDefinition[] {
  return AI_AGENT_DEFINITIONS.filter((definition) => !isAiAgentInstalled(statuses, definition.id))
}

/** Returns the compact trigger label for the selected agent. */
export function triggerLabel(defaultAgent: AiAgentId): string {
  return getAiAgentDefinition(defaultAgent).shortLabel
}

/** Returns the menu heading for the active or unavailable selected agent. */
export function menuHeading(defaultAgent: AiAgentId, selectedAgentReady: boolean): string {
  return selectedAgentReady
    ? `Active AI agent: ${getAiAgentDefinition(defaultAgent).label}`
    : `Selected AI agent unavailable: ${getAiAgentDefinition(defaultAgent).label}`
}

/** Formats one installed agent row with version detail. */
export function statusText(statuses: AiAgentsStatus, definition: AiAgentDefinition): string {
  const version = statuses[definition.id].version
  return version ? `${definition.label} ${version}` : definition.label
}

/** Returns true when the selected agent needs visible attention. */
export function hasAiAgentWarning(
  statuses: AiAgentsStatus,
  defaultAgent: AiAgentId,
  guidanceStatus?: VaultAiGuidanceStatus,
): boolean {
  return !hasAnyInstalledAiAgent(statuses)
    || !isAiAgentInstalled(statuses, defaultAgent)
    || !!(guidanceStatus && vaultAiGuidanceNeedsRestore(guidanceStatus))
}

/** Returns true when the trigger should hint that another installed agent is available. */
export function canShowSwitcherCue(statuses: AiAgentsStatus, defaultAgent: AiAgentId): boolean {
  return installedAgentDefinitions(statuses).some((definition) => definition.id !== defaultAgent)
}

/** Returns the footer trigger class for compact and regular bar modes. */
export function triggerButtonClassName(compact: boolean): string {
  return compact
    ? 'h-6 w-6 rounded-sm p-0 text-[11px] font-medium'
    : 'h-6 px-2 text-[11px] font-medium'
}
