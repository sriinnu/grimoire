import {
  AlertTriangle,
  Cpu,
  Terminal,
} from 'lucide-react'
import type { ClaudeCodeStatus } from '../../hooks/useClaudeCodeStatus'
import type { McpStatus } from '../../hooks/useMcpStatus'
import { openExternalUrl } from '../../utils/url'
import { ICON_STYLE } from './styles'
import { StatusBarAction, StatusBarSeparator } from './StatusBarAction'
export { SyncBadge } from './SyncBadge'
export {
  ChangesBadge,
  CommitBadge,
  CommitButton,
  ConflictBadge,
  LocalOnlyBadge,
  NoRemoteBadge,
  OfflineBadge,
  PulseBadge,
} from './StatusBarGitBadges'

const MCP_TOOLTIPS: Partial<Record<McpStatus, string>> = {
  not_installed: 'External AI tools not connected — click to set up',
}

const CLAUDE_INSTALL_URL = 'https://docs.anthropic.com/en/docs/claude-code'

function getMcpBadgeConfig(status: McpStatus, onInstall?: () => void) {
  if (status === 'installed' || status === 'checking') return null
  const clickable = status === 'not_installed' && Boolean(onInstall)
  return {
    clickable,
    tooltip: MCP_TOOLTIPS[status] ?? 'MCP status unknown',
    onClick: clickable ? onInstall : undefined,
  }
}

function getClaudeCodeBadgeConfig(status: ClaudeCodeStatus, version?: string | null) {
  if (status === 'checking') return null
  const missing = status === 'missing'
  return {
    missing,
    label: missing ? 'Claude Code missing' : 'Claude Code',
    tooltip: missing ? 'Claude Code not found — click to install' : `Claude Code${version ? ` ${version}` : ''}`,
    onActivate: missing ? () => openExternalUrl(CLAUDE_INSTALL_URL) : undefined,
  }
}

export function McpBadge({
  status,
  onInstall,
  showSeparator = true,
  compact = false,
}: {
  status: McpStatus
  onInstall?: () => void
  showSeparator?: boolean
  compact?: boolean
}) {
  const config = getMcpBadgeConfig(status, onInstall)
  if (!config) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: config.tooltip }}
        onClick={config.onClick}
        testId="status-mcp"
        tone="warning"
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Cpu size={13} />
          {compact ? null : 'MCP'}
          <AlertTriangle size={10} style={{ marginLeft: 2 }} />
        </span>
      </StatusBarAction>
    </>
  )
}

export function ClaudeCodeBadge({
  status,
  version,
  showSeparator = true,
  compact = false,
}: {
  status: ClaudeCodeStatus
  version?: string | null
  showSeparator?: boolean
  compact?: boolean
}) {
  const config = getClaudeCodeBadgeConfig(status, version)
  if (!config) return null

  return (
    <>
      <StatusBarSeparator show={showSeparator} />
      <StatusBarAction
        copy={{ label: config.tooltip }}
        onClick={config.onActivate}
        testId="status-claude-code"
        tone={config.missing ? 'warning' : undefined}
        compact={compact}
      >
        <span style={ICON_STYLE}>
          <Terminal size={13} />
          {compact ? null : config.label}
          {config.missing && <AlertTriangle size={10} style={{ marginLeft: 2 }} />}
        </span>
      </StatusBarAction>
    </>
  )
}
