import {
  AI_AGENT_CLI_DEFAULT_ROUTE,
  AI_AGENT_DEFINITIONS,
  getAiAgentDefinition,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import type { TranslationKey } from '../../lib/i18n'
import type { McpStatus } from '../../hooks/useMcpStatus'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { AiProviderKeysCard } from './AiProviderKeysCard'
import { ChitraguptaSocketCard } from './ChitraguptaSocketCard'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './primitives/SettingsGroup'
import {
  updateAiAgentModelDraft,
  updateAiAgentProviderDraft,
} from './settingsDraft'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

const CHITRAGUPTA_MCP_SURFACE_KEYS = [
  'settings.aiAgents.mcpSurfaceMemorySearch',
  'settings.aiAgents.mcpSurfaceRecall',
  'settings.aiAgents.mcpSurfaceWiki',
  'settings.aiAgents.mcpSurfaceGraph',
  'settings.aiAgents.mcpSurfaceIngest',
  'settings.aiAgents.mcpSurfaceDiagnostics',
  'settings.aiAgents.mcpSurfaceWriteSuggestions',
] as const

const MCP_STATUS_COPY_KEYS: Record<McpStatus, { value: TranslationKey; detail: TranslationKey }> = {
  checking: {
    value: 'settings.aiAgents.mcpStatusChecking',
    detail: 'settings.aiAgents.mcpStatusCheckingDetail',
  },
  installed: {
    value: 'settings.aiAgents.mcpStatusInstalled',
    detail: 'settings.aiAgents.mcpStatusInstalledDetail',
  },
  not_installed: {
    value: 'settings.aiAgents.mcpStatusNotInstalled',
    detail: 'settings.aiAgents.mcpStatusNotInstalledDetail',
  },
}

function mcpStatusToneClass(status: McpStatus): string {
  if (status === 'installed') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
  if (status === 'checking') return 'border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-200'
  return 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
}

function buildDefaultAiAgentOptions(aiAgentsStatus: AiAgentsStatus, t: SettingsTranslate): Array<{ value: string; label: string }> {
  return AI_AGENT_DEFINITIONS.map((definition) => {
    const status = aiAgentsStatus[definition.id]
    const suffix = status.status === 'installed'
      ? ` (${t('settings.aiAgents.installed')}${status.version ? ` ${status.version}` : ''})`
      : ` (${t('settings.aiAgents.missing')})`
    return {
      value: definition.id,
      label: `${definition.label}${suffix}`,
    }
  })
}

function describeAiAgentAvailability(agent: AiAgentId, aiAgentsStatus: AiAgentsStatus, t: SettingsTranslate): string {
  const definition = getAiAgentDefinition(agent)
  const status = aiAgentsStatus[agent]
  if (status.status === 'installed') {
    return t('settings.aiAgents.ready', {
      agent: definition.label,
      version: status.version ? ` ${status.version}` : '',
    })
  }
  return t('settings.aiAgents.notInstalled', { agent: definition.label })
}

function renderChitraguptaRouteSummary(provider: string, model: string, t: SettingsTranslate): string {
  const providerCopy = provider.trim()
    ? t('settings.aiAgents.routeProviderOverride', { provider: provider.trim() })
    : t('settings.aiAgents.routeProviderCli')
  const modelCopy = model.trim()
    ? t('settings.aiAgents.routeModelOverride', { model: model.trim() })
    : t('settings.aiAgents.routeModelCli')

  return t('settings.aiAgents.routeTruth', {
    modelRoute: modelCopy,
    providerRoute: providerCopy,
  })
}

/** MCP memory contract as a quiet full-width row: copy, runtime status, surfaces. */
function ChitraguptaMcpContractRow({
  t,
  mcpStatus,
  onInstallMcp,
}: {
  t: SettingsTranslate
  mcpStatus?: McpStatus
  onInstallMcp?: () => void
}) {
  const mcpStatusCopy = mcpStatus ? MCP_STATUS_COPY_KEYS[mcpStatus] : null

  return (
    <SettingsRow
      fullWidth
      label={t('settings.aiAgents.mcpContractTitle')}
      description={t('settings.aiAgents.mcpContractReady')}
      testId="settings-ai-agent-chitragupta-contract"
    >
      <div className="grid gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <div data-testid="settings-ai-agent-chitragupta-transport">
          {t('settings.aiAgents.mcpContractTransport')}
        </div>
        {mcpStatus && mcpStatusCopy ? (
          <div className="grid gap-1" data-testid="settings-ai-agent-mcp-runtime-status">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{t('settings.aiAgents.mcpStatusLabel')}</span>
              <span
                className={`rounded-full border px-2 py-0.5 font-medium ${mcpStatusToneClass(mcpStatus)}`}
                data-testid="settings-ai-agent-mcp-runtime-status-value"
              >
                {t(mcpStatusCopy.value)}
              </span>
              {onInstallMcp ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 px-2 text-[11px]"
                  onClick={onInstallMcp}
                  data-testid="settings-ai-agent-mcp-runtime-action"
                >
                  {t(mcpStatus === 'not_installed'
                    ? 'settings.aiAgents.mcpStatusConnect'
                    : 'settings.aiAgents.mcpStatusManage')}
                </Button>
              ) : null}
            </div>
            <div data-testid="settings-ai-agent-mcp-runtime-status-detail">
              {t(mcpStatusCopy.detail)}
            </div>
          </div>
        ) : null}
        <div>{CHITRAGUPTA_MCP_SURFACE_KEYS.map((surfaceKey) => t(surfaceKey)).join(' · ')}</div>
      </div>
    </SettingsRow>
  )
}

/** Renders default AI agent, provider, and model preferences as HIG groups. */
export function AiAgentSettingsSection({
  t,
  aiAgentsStatus,
  defaultAiAgent,
  setDefaultAiAgent,
  aiAgentModels,
  setAiAgentModels,
  aiAgentProviders,
  setAiAgentProviders,
  mcpStatus,
  onInstallMcp,
}: Pick<SettingsBodyProps,
  | 't'
  | 'aiAgentsStatus'
  | 'defaultAiAgent'
  | 'setDefaultAiAgent'
  | 'aiAgentModels'
  | 'setAiAgentModels'
  | 'aiAgentProviders'
  | 'setAiAgentProviders'
  | 'mcpStatus'
  | 'onInstallMcp'
>) {
  const selectedProvider = aiAgentProviders[defaultAiAgent] ?? ''
  const selectedModel = aiAgentModels[defaultAiAgent] ?? ''
  const providerPlaceholder = defaultAiAgent === 'chitragupta'
    ? AI_AGENT_CLI_DEFAULT_ROUTE
    : t('settings.aiAgents.providerPlaceholder')
  const handleProviderChange = (value: string) => {
    setAiAgentProviders(updateAiAgentProviderDraft(aiAgentProviders, defaultAiAgent, value))
  }
  const handleModelChange = (value: string) => {
    setAiAgentModels(updateAiAgentModelDraft(aiAgentModels, defaultAiAgent, value))
  }
  const showProviderOverride = defaultAiAgent === 'chitragupta'

  const agentsFootnote = showProviderOverride ? (
    <div className="grid gap-1.5">
      <div>{t('settings.aiAgents.description')}</div>
      <div className="grid gap-1" data-testid="settings-ai-agent-route-note">
        <div>{renderChitraguptaRouteSummary(selectedProvider, selectedModel, t)}</div>
        <div data-testid="settings-ai-agent-chitragupta-boundary">
          {t('settings.aiAgents.mcpBoundary')}
        </div>
      </div>
    </div>
  ) : t('settings.aiAgents.description')

  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.aiAgents.title')}</SettingsSectionTitle>

      <SettingsGroup footnote={agentsFootnote}>
        {AI_AGENT_DEFINITIONS.map((definition) => (
          <SettingsRow
            key={definition.id}
            label={definition.label}
            description={describeAiAgentAvailability(definition.id, aiAgentsStatus, t)}
            testId={`settings-ai-agent-status-${definition.id}`}
          />
        ))}

        <SettingsRow label={t('settings.aiAgents.default')}>
          <Select value={defaultAiAgent} onValueChange={(value) => setDefaultAiAgent(value as AiAgentId)}>
            <SelectTrigger
              className="w-64 bg-transparent"
              aria-label={t('settings.aiAgents.default')}
              data-testid="settings-default-ai-agent"
              data-value={defaultAiAgent}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              {buildDefaultAiAgentOptions(aiAgentsStatus, t).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsRow>

        {showProviderOverride ? (
          <SettingsRow label={t('settings.aiAgents.provider')}>
            <Input
              id="settings-default-ai-provider"
              value={selectedProvider}
              placeholder={providerPlaceholder}
              aria-label={t('settings.aiAgents.provider')}
              onChange={(event) => handleProviderChange(event.target.value)}
              data-testid="settings-default-ai-provider"
              className="w-48 bg-transparent"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProviderChange('')}
              disabled={!selectedProvider}
              data-testid="settings-default-ai-provider-clear"
              className="shrink-0"
            >
              {t('settings.aiAgents.providerDefault')}
            </Button>
          </SettingsRow>
        ) : null}

        <SettingsRow label={t('settings.aiAgents.model')}>
          <Input
            id="settings-default-ai-model"
            value={selectedModel}
            placeholder={t('settings.aiAgents.modelPlaceholder')}
            aria-label={t('settings.aiAgents.model')}
            onChange={(event) => handleModelChange(event.target.value)}
            data-testid="settings-default-ai-model"
            className="w-48 bg-transparent"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleModelChange('')}
            disabled={!selectedModel}
            data-testid="settings-default-ai-model-clear"
            className="shrink-0"
          >
            {t('settings.aiAgents.modelDefault')}
          </Button>
        </SettingsRow>

        {showProviderOverride ? (
          <ChitraguptaMcpContractRow t={t} mcpStatus={mcpStatus} onInstallMcp={onInstallMcp} />
        ) : null}
      </SettingsGroup>

      <AiProviderKeysCard t={t} />

      <ChitraguptaSocketCard t={t} />
    </div>
  )
}
