import { ArrowUpRight, Bot, CheckCircle2, Compass, Loader2, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  AI_AGENT_DEFINITIONS,
  AI_AGENTS_STATUS_SCAN_FAILED_DETAIL,
  BROWSER_PREVIEW_AI_STATUS_REASON,
  CHITRAGUPTA_CLI_MCP_BOUNDARY,
  getAiAgentDefinition,
  hasAnyInstalledAiAgent,
  isAiAgentsStatusChecking,
  isAiAgentsStatusScanFailed,
  isBrowserPreviewAiAgentsStatus,
  type AiAgentAvailability,
  type AiAgentDefinition,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../hooks/useAiAgentsStatus'
import { openExternalUrl } from '../utils/url'
import { desktopPlatformLabel, getDesktopPlatform, type DesktopPlatform } from '../utils/platform'
import { OnboardingShell } from './OnboardingShell'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'

interface AiAgentsOnboardingPromptProps {
  statuses: AiAgentsStatus
  onContinue: () => void
}

function getPromptCopy(statuses: AiAgentsStatus) {
  if (isAiAgentsStatusChecking(statuses)) {
    return {
      accentClassName: 'bg-muted text-muted-foreground',
      description: 'Checking which AI agents are available on this machine.',
      icon: <Loader2 className="size-7 animate-spin" />,
      title: 'Checking AI agents',
    }
  }

  if (isBrowserPreviewAiAgentsStatus(statuses)) {
    return {
      accentClassName: 'bg-muted text-muted-foreground',
      description: 'Browser preview cannot launch local CLI agents. Open the native Grimoire app for live Claude, Codex, and Chitragupta.',
      icon: <Bot className="size-7" />,
      title: 'Open native app for live AI',
    }
  }

  if (isAiAgentsStatusScanFailed(statuses)) {
    return {
      accentClassName: 'bg-[var(--feedback-warning-bg)] text-[var(--feedback-warning-text)]',
      description: 'The native CLI check did not finish cleanly. This is not proof that Claude, Codex, or Chitragupta are missing.',
      icon: <Bot className="size-7" />,
      title: 'AI scan needs retry',
    }
  }

  if (!hasAnyInstalledAiAgent(statuses)) {
    return {
      accentClassName: 'bg-[var(--feedback-warning-bg)] text-[var(--feedback-warning-text)]',
      description: 'Grimoire works best with a local CLI AI agent installed.',
      icon: <Bot className="size-7" />,
      title: 'No AI agents detected',
    }
  }

  return {
    accentClassName: 'bg-[var(--feedback-success-bg)] text-[var(--feedback-success-text)]',
    description: 'At least one local CLI route is available. Missing agents can be installed later.',
    icon: <CheckCircle2 className="size-7" />,
    title: 'AI CLI routes detected',
  }
}

function scanSummary(statuses: AiAgentsStatus): string {
  if (isBrowserPreviewAiAgentsStatus(statuses)) return 'Browser preview cannot inspect local CLI paths.'
  if (isAiAgentsStatusScanFailed(statuses)) return 'Native CLI scan failed before agent availability could be verified. Choose Check again after Grimoire finishes launching.'
  if (isAiAgentsStatusChecking(statuses)) return 'Scanning PATH, login shell, Homebrew, npm/pnpm, nvm/fnm, Volta, and common app launcher paths.'
  const installed = AI_AGENT_DEFINITIONS.filter((definition) => statuses[definition.id].status === 'installed').length
  const missing = AI_AGENT_DEFINITIONS.length - installed
  return `${installed} detected, ${missing} missing after scanning local CLI paths.`
}

function scanLocations(platform: DesktopPlatform): string {
  if (platform === 'windows') {
    return 'PATH/where.exe, npm and pnpm shims, Volta, nvm-windows, Program Files, LocalAppData, and Scoop.'
  }
  if (platform === 'linux') {
    return 'PATH, login shell, npm and pnpm shims, nvm/fnm, Volta, /usr/local/bin, and ~/.local/bin.'
  }
  if (platform === 'macos') {
    return 'PATH, login shell, Homebrew, npm and pnpm shims, nvm/fnm, Volta, ~/.local/bin, and /Applications.'
  }
  return 'PATH, login shell, package-manager shims, version-manager bins, and common app launcher paths.'
}

function scanLocationsForStatus(statuses: AiAgentsStatus, platform: DesktopPlatform): string {
  if (isBrowserPreviewAiAgentsStatus(statuses)) {
    return 'Open the native desktop app to inspect PATH, shell, package-manager shims, version-manager bins, and app launcher paths.'
  }
  return scanLocations(platform)
}

function nextStepCopy(statuses: AiAgentsStatus): string {
  if (isBrowserPreviewAiAgentsStatus(statuses)) return 'Open the native desktop app when you want live local agents.'
  if (isAiAgentsStatusChecking(statuses)) return 'Wait for the scan to finish before installing or changing agent settings.'
  if (isAiAgentsStatusScanFailed(statuses)) return 'Retry the scan before treating any CLI as missing.'
  if (hasAnyInstalledAiAgent(statuses)) return 'Continue now; missing agents stay optional and can be linked later.'
  return 'Install one CLI or continue without live AI. Notes, search, and local vault work still run.'
}

function installedCount(statuses: AiAgentsStatus): number {
  return AI_AGENT_DEFINITIONS.filter((definition) => statuses[definition.id].status === 'installed').length
}

function isRetryNeededAgentStatus(status: AiAgentAvailability): boolean {
  return status.status === 'missing' && status.detail === AI_AGENTS_STATUS_SCAN_FAILED_DETAIL
}

function statusBadgeClass(status: AiAgentAvailability): string {
  if (status.status === 'installed') return 'bg-[var(--feedback-success-bg)] text-[var(--feedback-success-text)]'
  if (status.status === 'checking') return 'bg-muted text-muted-foreground'
  return 'bg-[var(--feedback-warning-bg)] text-[var(--feedback-warning-text)]'
}

function statusBadgeLabel(status: AiAgentAvailability): string {
  if (status.status === 'installed') return 'Installed'
  if (status.status === 'checking') return 'Checking'
  if (isRetryNeededAgentStatus(status)) return 'Retry needed'
  return 'Missing'
}

function agentStatusDetail(definition: AiAgentDefinition, status: AiAgentAvailability): string {
  if (status.status === 'checking') return 'Scanning local CLI paths.'
  if (status.status === 'installed') {
    const version = status.version ? ` ${status.version}` : ''
    if (definition.id === 'chitragupta') return `Chitragupta${version} CLI chat route found.`
    return `${definition.label}${version} CLI route found.`
  }
  return status.detail ?? status.version ?? `${definition.label} CLI was not found in common local paths.`
}

function agentSecondaryDetail(definition: AiAgentDefinition, status: AiAgentAvailability): string | null {
  if (definition.id === 'chitragupta' && status.status === 'installed') return CHITRAGUPTA_CLI_MCP_BOUNDARY
  if (status.version === BROWSER_PREVIEW_AI_STATUS_REASON) return null
  if (status.detail === AI_AGENTS_STATUS_SCAN_FAILED_DETAIL) return 'Retry the scan before installing or relinking this CLI.'
  if (status.status === 'missing') return 'Install or link the CLI, then choose Check again.'
  return status.detail ?? null
}

function continueLabel(statuses: AiAgentsStatus): string {
  if (isBrowserPreviewAiAgentsStatus(statuses)) return 'Continue in preview'
  if (hasAnyInstalledAiAgent(statuses)) return 'Continue'
  if (isAiAgentsStatusScanFailed(statuses)) return 'Continue without live AI'
  return 'Continue without it'
}

function AgentStatusList({ statuses }: { statuses: AiAgentsStatus }) {
  return (
    <div className="space-y-3">
      {AI_AGENT_DEFINITIONS.map((definition) => {
        const status = statuses[definition.id]
        const secondaryDetail = agentSecondaryDetail(definition, status)
        return (
          <div
            key={definition.id}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm"
            data-testid={`ai-agent-status-${definition.id}`}
          >
            <div className="min-w-0 space-y-1 text-left">
              <div className="font-medium text-foreground">{definition.label}</div>
              <div className="text-xs text-muted-foreground">
                {agentStatusDetail(definition, status)}
              </div>
              {secondaryDetail ? <div className="text-[11px] leading-5 text-muted-foreground/80">{secondaryDetail}</div> : null}
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusBadgeClass(status)}`}
            >
              {statusBadgeLabel(status)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function refreshAiAgentsStatus() {
  window.dispatchEvent(new Event(AI_AGENTS_STATUS_REFRESH_EVENT))
}

function ScanReceipt({ statuses }: { statuses: AiAgentsStatus }) {
  const platform = getDesktopPlatform()
  const platformLabel = desktopPlatformLabel(platform)
  const browserPreview = isBrowserPreviewAiAgentsStatus(statuses)
  const scanFailed = isAiAgentsStatusScanFailed(statuses)
  const checking = isAiAgentsStatusChecking(statuses)
  const detected = installedCount(statuses)

  return (
    <div
      className="grid gap-3 rounded-xl border border-border bg-muted/15 p-4 text-left md:grid-cols-3"
      data-testid="ai-agents-onboarding-scan-receipt"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Compass className="size-3.5" />
          {browserPreview ? 'Native app scan' : `${platformLabel} scan`}
        </div>
        <p className="text-xs leading-5 text-muted-foreground" data-testid="ai-agent-scan-locations">
          {scanLocationsForStatus(statuses, platform)}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <RotateCcw className="size-3.5" />
          Result
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {browserPreview ? 'Native app required.' : checking ? 'Scanning now.' : scanFailed ? 'Scan retry needed.' : `${detected} chat route${detected === 1 ? '' : 's'} detected.`}
        </p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <ShieldCheck className="size-3.5" />
          Boundary
        </div>
        <p className="text-xs leading-5 text-muted-foreground" data-testid="ai-agent-next-step">
          {nextStepCopy(statuses)}
        </p>
      </div>
    </div>
  )
}

export function AiAgentsOnboardingPrompt({
  statuses,
  onContinue,
}: AiAgentsOnboardingPromptProps) {
  const copy = getPromptCopy(statuses)
  const isBrowserPreview = isBrowserPreviewAiAgentsStatus(statuses)
  const isScanFailed = isAiAgentsStatusScanFailed(statuses)
  const isChecking = isAiAgentsStatusChecking(statuses)
  const showLegacyClaudeCompatibility = statuses.claude_code.status !== 'installed' && !isScanFailed
  const missingAgents = isScanFailed
    ? []
    : AI_AGENT_DEFINITIONS.filter((definition) => statuses[definition.id].status === 'missing')

  return (
    <OnboardingShell
      className="bg-sidebar px-6 py-10"
      contentClassName="w-full max-w-2xl"
      testId="ai-agents-onboarding-screen"
    >
      <Card className="border-border bg-background shadow-sm">
        <CardHeader className="items-center gap-5 text-center">
          <div className={`flex size-16 items-center justify-center rounded-2xl ${copy.accentClassName}`}>
            {copy.icon}
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight">
              {copy.title}
            </CardTitle>
            <p className="text-sm leading-6 text-muted-foreground" data-testid="ai-agents-onboarding-description">
              {copy.description}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div
            className="rounded-lg border border-border bg-muted/15 px-4 py-3 text-left"
            data-testid="ai-agents-onboarding-scan-summary"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Native CLI scan</div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{scanSummary(statuses)}</p>
          </div>
          <ScanReceipt statuses={statuses} />
          {showLegacyClaudeCompatibility && !isBrowserPreview ? (
            <div
              className="rounded-lg border border-[var(--feedback-warning-border)] bg-[var(--feedback-warning-bg)] px-4 py-3 text-left"
              data-testid="claude-onboarding-screen"
            >
              <div className="text-sm font-medium text-[var(--feedback-warning-text)]">Claude Code not detected</div>
              <p className="mt-1 text-xs leading-5 text-[var(--feedback-warning-text)]">
                Install Claude Code or continue without it.
              </p>
            </div>
          ) : null}
          <AgentStatusList statuses={statuses} />
        </CardContent>

        <CardFooter className="flex-wrap justify-center gap-3">
          {!isBrowserPreview && (
            <Button
              type="button"
              variant="outline"
              onClick={refreshAiAgentsStatus}
              disabled={isChecking}
              data-testid="ai-agents-onboarding-refresh"
            >
              Check again
            </Button>
          )}
          {!isBrowserPreview && missingAgents.map((definition) => (
            <Button
              key={definition.id}
              type="button"
              variant="outline"
              onClick={() => void openExternalUrl(getAiAgentDefinition(definition.id).installUrl)}
              data-testid={`ai-agents-onboarding-install-${definition.id}`}
            >
              Install {definition.label}
              <ArrowUpRight className="size-4" />
            </Button>
          ))}
          <div data-testid="ai-agents-onboarding-continue">
            <Button
              type="button"
              onClick={onContinue}
              disabled={isAiAgentsStatusChecking(statuses)}
              data-testid={showLegacyClaudeCompatibility && !isBrowserPreview ? 'claude-onboarding-continue' : undefined}
            >
              {continueLabel(statuses)}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </OnboardingShell>
  )
}
