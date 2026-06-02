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
import { AiProviderKeysCard } from './AiProviderKeysCard'
import { LabeledSelect, SectionHeading } from './SettingsControls'
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

function renderDefaultAiAgentSummary(defaultAiAgent: AiAgentId, aiAgentsStatus: AiAgentsStatus, t: SettingsTranslate): string {
  const definition = getAiAgentDefinition(defaultAiAgent)
  const status = aiAgentsStatus[defaultAiAgent]
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

function ChitraguptaMcpContractCard({
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
    <div
      className="settings-material-inner mt-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      data-testid="settings-ai-agent-chitragupta-contract"
    >
      <div className="font-medium text-foreground">{t('settings.aiAgents.mcpContractTitle')}</div>
      <div>{t('settings.aiAgents.mcpContractReady')}</div>
      <div className="mt-1" data-testid="settings-ai-agent-chitragupta-transport">
        {t('settings.aiAgents.mcpContractTransport')}
      </div>
      {mcpStatus && mcpStatusCopy ? (
        <div
          className="mt-2 rounded-md border border-border/70 px-2.5 py-2"
          data-testid="settings-ai-agent-mcp-runtime-status"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-foreground">{t('settings.aiAgents.mcpStatusLabel')}</span>
            <span
              className={`rounded-full border px-2 py-0.5 font-medium ${mcpStatusToneClass(mcpStatus)}`}
              data-testid="settings-ai-agent-mcp-runtime-status-value"
            >
              {t(mcpStatusCopy.value)}
            </span>
          </div>
          <div className="mt-1" data-testid="settings-ai-agent-mcp-runtime-status-detail">
            {t(mcpStatusCopy.detail)}
          </div>
          {onInstallMcp ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 h-7 px-2 text-[11px]"
              onClick={onInstallMcp}
              data-testid="settings-ai-agent-mcp-runtime-action"
            >
              {t(mcpStatus === 'not_installed'
                ? 'settings.aiAgents.mcpStatusConnect'
                : 'settings.aiAgents.mcpStatusManage')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1">
        {CHITRAGUPTA_MCP_SURFACE_KEYS.map((surfaceKey) => (
          <span
            key={surfaceKey}
            className="settings-material-chip rounded-full border px-2 py-0.5 font-medium text-foreground/85"
          >
            {t(surfaceKey)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Renders default AI agent, provider, and model preferences. */
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

  return (
    <>
      <SectionHeading
        title={t('settings.aiAgents.title')}
        description={t('settings.aiAgents.description')}
      />

      <LabeledSelect
        label={t('settings.aiAgents.default')}
        value={defaultAiAgent}
        onValueChange={(value) => setDefaultAiAgent(value as AiAgentId)}
        options={buildDefaultAiAgentOptions(aiAgentsStatus, t)}
        testId="settings-default-ai-agent"
      />

      {showProviderOverride && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-foreground" htmlFor="settings-default-ai-provider">
            {t('settings.aiAgents.provider')}
          </label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="settings-default-ai-provider"
              value={selectedProvider}
              placeholder={providerPlaceholder}
              onChange={(event) => handleProviderChange(event.target.value)}
              data-testid="settings-default-ai-provider"
              className="min-w-[220px] flex-1 bg-transparent"
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
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-foreground" htmlFor="settings-default-ai-model">
          {t('settings.aiAgents.model')}
        </label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="settings-default-ai-model"
            value={selectedModel}
            placeholder={t('settings.aiAgents.modelPlaceholder')}
            onChange={(event) => handleModelChange(event.target.value)}
            data-testid="settings-default-ai-model"
            className="min-w-[220px] flex-1 bg-transparent"
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
        </div>
      </div>

      <div className="text-[11px] leading-relaxed text-muted-foreground">
        {renderDefaultAiAgentSummary(defaultAiAgent, aiAgentsStatus, t)}
      </div>

      <AiProviderKeysCard t={t} />

      {showProviderOverride ? (
        <div
          className="settings-material-card rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
          data-testid="settings-ai-agent-route-note"
        >
          <div>{renderChitraguptaRouteSummary(selectedProvider, selectedModel, t)}</div>
          <div className="mt-1" data-testid="settings-ai-agent-chitragupta-boundary">
            {t('settings.aiAgents.mcpBoundary')}
          </div>
          <ChitraguptaMcpContractCard t={t} mcpStatus={mcpStatus} onInstallMcp={onInstallMcp} />
        </div>
      ) : null}
    </>
  )
}
