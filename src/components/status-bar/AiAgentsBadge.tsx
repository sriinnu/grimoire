import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertTriangle, ChevronsUpDown } from 'lucide-react'
import { Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  AI_AGENT_DEFINITIONS,
  getAiAgentDefinition,
  hasAnyInstalledAiAgent,
  isBrowserPreviewAiAgentsStatus,
  isAiAgentInstalled,
  isAiAgentsStatusChecking,
  type AiAgentId,
  type AiAgentDefinition,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../../hooks/useAiAgentsStatus'
import {
  getVaultAiGuidanceSummary,
  isVaultAiGuidanceStatusChecking,
  vaultAiGuidanceNeedsRestore,
  vaultAiGuidanceUsesCustomFiles,
  type VaultAiGuidanceStatus,
} from '../../lib/vaultAiGuidance'
import { openExternalUrl } from '../../utils/url'
import { ICON_STYLE, SEP_STYLE } from './styles'
import { StatusBarHint } from './StatusBarHint'
import { useDismissibleLayer } from './useDismissibleLayer'

interface AiAgentsBadgeProps {
  statuses: AiAgentsStatus
  guidanceStatus?: VaultAiGuidanceStatus
  defaultAgent: AiAgentId
  onSetDefaultAgent?: (agent: AiAgentId) => void
  onRestoreGuidance?: () => void
  compact?: boolean
}

function badgeTooltip(
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
  if (!guidanceSummary) return base
  if (vaultAiGuidanceNeedsRestore(guidanceStatus!)) {
    return `${base}. ${guidanceSummary} — click for restore details`
  }
  if (vaultAiGuidanceUsesCustomFiles(guidanceStatus!)) {
    return `${base}. ${guidanceSummary}`
  }
  return base
}

function installedAgentDefinitions(statuses: AiAgentsStatus): AiAgentDefinition[] {
  return AI_AGENT_DEFINITIONS.filter((definition) => isAiAgentInstalled(statuses, definition.id))
}

function missingAgentDefinitions(statuses: AiAgentsStatus): AiAgentDefinition[] {
  return AI_AGENT_DEFINITIONS.filter((definition) => !isAiAgentInstalled(statuses, definition.id))
}

function triggerLabel(defaultAgent: AiAgentId): string {
  return getAiAgentDefinition(defaultAgent).shortLabel
}

function menuHeading(defaultAgent: AiAgentId, selectedAgentReady: boolean): string {
  return selectedAgentReady
    ? `Active AI agent: ${getAiAgentDefinition(defaultAgent).label}`
    : `Selected AI agent unavailable: ${getAiAgentDefinition(defaultAgent).label}`
}

function statusText(statuses: AiAgentsStatus, definition: AiAgentDefinition): string {
  const version = statuses[definition.id].version
  return version ? `${definition.label} ${version}` : definition.label
}

function canSwitchAgents(
  installedAgents: AiAgentDefinition[],
  defaultAgent: AiAgentId,
): boolean {
  return installedAgents.some((definition) => definition.id !== defaultAgent)
}

function hasAiAgentWarning(
  statuses: AiAgentsStatus,
  defaultAgent: AiAgentId,
  guidanceStatus?: VaultAiGuidanceStatus,
): boolean {
  return !hasAnyInstalledAiAgent(statuses)
    || !isAiAgentInstalled(statuses, defaultAgent)
    || !!(guidanceStatus && vaultAiGuidanceNeedsRestore(guidanceStatus))
}

function canShowSwitcherCue(statuses: AiAgentsStatus, defaultAgent: AiAgentId): boolean {
  return canSwitchAgents(installedAgentDefinitions(statuses), defaultAgent)
}

function triggerButtonClassName(compact: boolean): string {
  return compact
    ? 'h-6 w-6 rounded-sm p-0 text-[11px] font-medium'
    : 'h-6 px-2 text-[11px] font-medium'
}

function CompactSeparator({ compact }: { compact: boolean }) {
  if (compact) return null
  return <span style={SEP_STYLE}>|</span>
}

function TriggerLabel({ compact, defaultAgent }: { compact: boolean; defaultAgent: AiAgentId }) {
  if (compact) return null
  return triggerLabel(defaultAgent)
}

function TriggerStateIcon({
  showWarning,
  showSwitcherCue,
}: {
  showWarning: boolean
  showSwitcherCue: boolean
}) {
  if (showWarning) return <AlertTriangle size={10} style={{ marginLeft: 2 }} />
  if (showSwitcherCue) return <ChevronsUpDown size={10} style={{ marginLeft: 2 }} />
  return null
}

function MenuSeparator() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
}

function MenuLabel({ children }: { children: string }) {
  return <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">{children}</div>
}

function MenuItem({
  children,
  disabled = false,
  onSelect,
  testId,
}: {
  children: React.ReactNode
  disabled?: boolean
  onSelect?: () => void
  testId?: string
}) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (!onSelect || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onSelect()
  }

  return (
    <Button
      type="button"
      role="menuitem"
      variant="ghost"
      size="xs"
      disabled={disabled}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      data-testid={testId}
      className="h-auto w-full justify-start rounded-sm px-2 py-1 text-left text-xs font-normal"
    >
      {children}
    </Button>
  )
}

function AgentRadioItem({
  checked,
  children,
  onSelect,
}: {
  checked: boolean
  children: React.ReactNode
  onSelect: () => void
}) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect()
  }

  return (
    <Button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      variant="ghost"
      size="xs"
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className="h-auto w-full justify-start rounded-sm px-2 py-1 text-left text-xs font-normal"
    >
      {children}
    </Button>
  )
}

function GuidanceMenuSection({
  guidanceStatus,
  onRestoreGuidance,
}: Pick<AiAgentsBadgeProps, 'guidanceStatus' | 'onRestoreGuidance'>) {
  if (!guidanceStatus || isVaultAiGuidanceStatusChecking(guidanceStatus)) return null

  return (
    <>
      <MenuSeparator />
      <MenuLabel>Vault guidance</MenuLabel>
      <MenuItem disabled testId="status-ai-guidance-summary">
        {getVaultAiGuidanceSummary(guidanceStatus)}
      </MenuItem>
      {vaultAiGuidanceNeedsRestore(guidanceStatus) && guidanceStatus.canRestore && (
        <MenuItem
          onSelect={onRestoreGuidance}
          testId="status-ai-guidance-restore"
        >
          Restore Grimoire AI Guidance
        </MenuItem>
      )}
    </>
  )
}

function AgentMenuContent({
  statuses,
  guidanceStatus,
  defaultAgent,
  selectedAgentReady,
  onSetDefaultAgent,
  onRestoreGuidance,
}: AiAgentsBadgeProps & { selectedAgentReady: boolean }) {
  const installedAgents = installedAgentDefinitions(statuses)
  const missingAgents = missingAgentDefinitions(statuses)
  const isBrowserPreview = isBrowserPreviewAiAgentsStatus(statuses)
  const refreshAgentsStatus = () => {
    window.dispatchEvent(new Event(AI_AGENTS_STATUS_REFRESH_EVENT))
  }

  return (
    <div
      role="menu"
      style={{
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        bottom: 'calc(100% + 6px)',
        boxShadow: '0 10px 26px color-mix(in srgb, #000 16%, transparent)',
        color: 'var(--popover-foreground)',
        left: 0,
        minWidth: 288,
        padding: 4,
        position: 'absolute',
        zIndex: 1200,
      }}
      data-testid="status-ai-agents-menu"
    >
      <MenuLabel>{menuHeading(defaultAgent, selectedAgentReady)}</MenuLabel>
      {installedAgents.length === 0 ? (
        <MenuItem disabled>
          {isBrowserPreview ? 'Open native Grimoire for live AI' : 'No AI agents detected'}
        </MenuItem>
      ) : (
        <div role="group" aria-label="Installed AI agents">
          {installedAgents.map((definition) => (
            <AgentRadioItem
              key={definition.id}
              checked={selectedAgentReady && definition.id === defaultAgent}
              onSelect={() => onSetDefaultAgent?.(definition.id)}
            >
              <span>{definition.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {statusText(statuses, definition)}
              </span>
            </AgentRadioItem>
          ))}
        </div>
      )}
      {missingAgents.length > 0 && !isBrowserPreview && (
        <>
          <MenuSeparator />
          <MenuLabel>Install</MenuLabel>
          {missingAgents.map((definition) => (
            <MenuItem
              key={definition.id}
              onSelect={() => void openExternalUrl(definition.installUrl)}
            >
              Install {definition.label}
            </MenuItem>
          ))}
        </>
      )}
      {!isBrowserPreview && (
        <>
          <MenuSeparator />
          <MenuItem
            onSelect={refreshAgentsStatus}
            testId="status-ai-agents-refresh"
          >
            Check AI agents again
          </MenuItem>
        </>
      )}
      <GuidanceMenuSection
        guidanceStatus={guidanceStatus}
        onRestoreGuidance={onRestoreGuidance}
      />
    </div>
  )
}

export function AiAgentsBadge({
  statuses,
  guidanceStatus,
  defaultAgent,
  onSetDefaultAgent,
  onRestoreGuidance,
  compact = false,
}: AiAgentsBadgeProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedAgentReady = isAiAgentInstalled(statuses, defaultAgent)
  const showWarning = hasAiAgentWarning(statuses, defaultAgent, guidanceStatus)
  const showSwitcherCue = !showWarning && canShowSwitcherCue(statuses, defaultAgent)

  useDismissibleLayer(open, containerRef, () => setOpen(false))

  if (isAiAgentsStatusChecking(statuses)) return null

  return (
    <>
      <CompactSeparator compact={compact} />
      <div ref={containerRef} style={{ position: 'relative' }}>
        <StatusBarHint copy={{ label: badgeTooltip(statuses, defaultAgent, guidanceStatus) }}>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className={triggerButtonClassName(compact)}
            aria-label="Open AI agent options"
            aria-haspopup="menu"
            aria-expanded={open}
            data-testid="status-ai-agents"
            onClick={() => setOpen((value) => !value)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowDown') return
              event.preventDefault()
              setOpen(true)
            }}
          >
            <span style={{ ...ICON_STYLE, color: showWarning ? 'var(--status-bar-warning-fg, var(--accent-orange))' : 'var(--muted-foreground)' }}>
              <Sparkle size={13} weight="fill" />
              <TriggerLabel compact={compact} defaultAgent={defaultAgent} />
              <TriggerStateIcon showWarning={showWarning} showSwitcherCue={showSwitcherCue} />
            </span>
          </Button>
        </StatusBarHint>
        {open ? (
          <AgentMenuContent
            statuses={statuses}
            guidanceStatus={guidanceStatus}
            defaultAgent={defaultAgent}
            onSetDefaultAgent={(agent) => {
              onSetDefaultAgent?.(agent)
              setOpen(false)
            }}
            onRestoreGuidance={onRestoreGuidance}
            selectedAgentReady={selectedAgentReady}
          />
        ) : null}
      </div>
    </>
  )
}
