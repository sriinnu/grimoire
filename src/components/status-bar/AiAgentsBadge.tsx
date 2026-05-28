import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { AlertTriangle, ChevronsUpDown } from 'lucide-react'
import { Sparkle } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  CHITRAGUPTA_CLI_MCP_BOUNDARY,
  describeAiAgentRoute,
  isBrowserPreviewAiAgentsStatus,
  isAiAgentInstalled,
  isAiAgentsStatusChecking,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../../hooks/useAiAgentsStatus'
import {
  getVaultAiGuidanceSummary,
  isVaultAiGuidanceStatusChecking,
  vaultAiGuidanceNeedsRestore,
  type VaultAiGuidanceStatus,
} from '../../lib/vaultAiGuidance'
import { openExternalUrl } from '../../utils/url'
import { ICON_STYLE, SEP_STYLE, STATUS_BAR_MUTED_FOREGROUND } from './styles'
import { StatusBarHint } from './StatusBarHint'
import { useDismissibleLayer } from './useDismissibleLayer'
import {
  badgeTooltip,
  canShowSwitcherCue,
  hasAiAgentWarning,
  installedAgentDefinitions,
  menuHeading,
  missingAgentDefinitions,
  statusText,
  triggerButtonClassName,
  triggerLabel,
} from './AiAgentsBadgeModel'

interface AiAgentsBadgeProps {
  statuses: AiAgentsStatus
  guidanceStatus?: VaultAiGuidanceStatus
  defaultAgent: AiAgentId
  defaultAgentProvider?: string | null
  defaultAgentModel?: string | null
  onSetDefaultAgent?: (agent: AiAgentId) => void
  onRestoreGuidance?: () => void
  compact?: boolean
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
  defaultAgentProvider,
  defaultAgentModel,
  selectedAgentReady,
  onSetDefaultAgent,
  onRestoreGuidance,
}: AiAgentsBadgeProps & { selectedAgentReady: boolean }) {
  const installedAgents = installedAgentDefinitions(statuses)
  const missingAgents = missingAgentDefinitions(statuses)
  const isBrowserPreview = isBrowserPreviewAiAgentsStatus(statuses)
  const routeLabel = describeAiAgentRoute(defaultAgent, defaultAgentProvider, defaultAgentModel)
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
      {routeLabel ? (
        <MenuItem disabled testId="status-ai-agents-route-truth">
          Route: {routeLabel}
        </MenuItem>
      ) : null}
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
      {statuses.chitragupta.status === 'installed' && (
        <MenuItem disabled testId="status-ai-agents-chitragupta-boundary">
          {CHITRAGUPTA_CLI_MCP_BOUNDARY}
        </MenuItem>
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
  defaultAgentProvider,
  defaultAgentModel,
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
            <span style={{ ...ICON_STYLE, color: showWarning ? 'var(--status-bar-warning-fg, var(--accent-orange))' : STATUS_BAR_MUTED_FOREGROUND }}>
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
            defaultAgentProvider={defaultAgentProvider}
            defaultAgentModel={defaultAgentModel}
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
