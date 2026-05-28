import {
  AI_AGENT_CLI_DEFAULT_ROUTE,
  AI_AGENT_DEFINITIONS,
  CHITRAGUPTA_CLI_MCP_BOUNDARY,
  CHITRAGUPTA_MCP_READINESS_COPY,
  CHITRAGUPTA_MCP_REQUIRED_SURFACES,
  getAiAgentDefinition,
  type AiAgentId,
  type AiAgentsStatus,
} from '../../lib/aiAgents'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { LabeledSelect, SectionHeading } from './SettingsControls'
import {
  updateAiAgentModelDraft,
  updateAiAgentProviderDraft,
} from './settingsDraft'
import type { SettingsBodyProps, SettingsTranslate } from './settingsTypes'

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

function ChitraguptaMcpContractCard() {
  return (
    <div
      className="settings-material-inner mt-2 rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
      data-testid="settings-ai-agent-chitragupta-contract"
    >
      <div className="font-medium text-foreground">MCP memory contract</div>
      <div>{CHITRAGUPTA_MCP_READINESS_COPY}</div>
      <div className="mt-2 flex flex-wrap gap-1">
        {CHITRAGUPTA_MCP_REQUIRED_SURFACES.map((surface) => (
          <span
            key={surface}
            className="settings-material-chip rounded-full border px-2 py-0.5 font-medium text-foreground/85"
          >
            {surface}
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
}: Pick<SettingsBodyProps,
  | 't'
  | 'aiAgentsStatus'
  | 'defaultAiAgent'
  | 'setDefaultAiAgent'
  | 'aiAgentModels'
  | 'setAiAgentModels'
  | 'aiAgentProviders'
  | 'setAiAgentProviders'
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
          <div className="flex gap-2">
            <Input
              id="settings-default-ai-provider"
              value={selectedProvider}
              placeholder={providerPlaceholder}
              onChange={(event) => handleProviderChange(event.target.value)}
              data-testid="settings-default-ai-provider"
              className="w-full bg-transparent"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleProviderChange('')}
              disabled={!selectedProvider}
              data-testid="settings-default-ai-provider-clear"
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
        <div className="flex gap-2">
          <Input
            id="settings-default-ai-model"
            value={selectedModel}
            placeholder={t('settings.aiAgents.modelPlaceholder')}
            onChange={(event) => handleModelChange(event.target.value)}
            data-testid="settings-default-ai-model"
            className="w-full bg-transparent"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleModelChange('')}
            disabled={!selectedModel}
            data-testid="settings-default-ai-model-clear"
          >
            {t('settings.aiAgents.modelDefault')}
          </Button>
        </div>
      </div>

      <div className="text-[11px] leading-relaxed text-muted-foreground">
        {renderDefaultAiAgentSummary(defaultAiAgent, aiAgentsStatus, t)}
      </div>

      {showProviderOverride ? (
        <div
          className="settings-material-card rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
          data-testid="settings-ai-agent-route-note"
        >
          <div>{renderChitraguptaRouteSummary(selectedProvider, selectedModel, t)}</div>
          <div className="mt-1" data-testid="settings-ai-agent-chitragupta-boundary">
            {CHITRAGUPTA_CLI_MCP_BOUNDARY}
          </div>
          <ChitraguptaMcpContractCard />
        </div>
      ) : null}
    </>
  )
}
