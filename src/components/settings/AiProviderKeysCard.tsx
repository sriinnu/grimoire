import { useState } from 'react'
import {
  AI_PROVIDER_KEY_PLACEHOLDER,
  AI_PROVIDER_KEY_SOURCE_TONE,
  type AiProviderKeySource,
  type AiProviderKeyStatus,
} from '../../lib/aiProviderKeys'
import { useAiProviderKeys } from '../../hooks/useAiProviderKeys'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { SettingsTranslate } from './settingsTypes'

function sourceLabel(source: AiProviderKeySource, t: SettingsTranslate): string {
  if (source === 'keychain') return t('settings.aiAgents.providerKeysKeychain')
  if (source === 'environment') return t('settings.aiAgents.providerKeysEnvironment')
  return t('settings.aiAgents.providerKeysMissing')
}

function keyStatusBadge(status: AiProviderKeyStatus, t: SettingsTranslate) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${AI_PROVIDER_KEY_SOURCE_TONE[status.source]}`}
      data-source={status.source}
      data-testid={`settings-ai-provider-key-source-${status.provider_id}`}
    >
      {sourceLabel(status.source, t)}
    </span>
  )
}

/** Renders redacted provider API-key controls backed by native secure storage. */
export function AiProviderKeysCard({ t }: { t: SettingsTranslate }) {
  const {
    statuses,
    loading,
    error,
    saveProviderApiKey,
    clearProviderApiKey,
  } = useAiProviderKeys()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const updateDraft = (providerId: string, value: string) => {
    setDrafts((current) => ({ ...current, [providerId]: value }))
  }

  const saveDraft = async (providerId: string) => {
    const draft = drafts[providerId]?.trim() ?? ''
    if (!draft) return
    setBusyProvider(providerId)
    setLocalError(null)
    try {
      await saveProviderApiKey(providerId, draft)
      setDrafts((current) => ({ ...current, [providerId]: '' }))
    } catch (saveError) {
      setLocalError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusyProvider(null)
    }
  }

  const clearKey = async (providerId: string) => {
    setBusyProvider(providerId)
    setLocalError(null)
    try {
      await clearProviderApiKey(providerId)
    } catch (clearError) {
      setLocalError(clearError instanceof Error ? clearError.message : String(clearError))
    } finally {
      setBusyProvider(null)
    }
  }

  return (
    <section
      className="settings-material-card rounded-md border px-3 py-3 text-[11px] leading-relaxed"
      data-testid="settings-ai-provider-keys"
    >
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold text-foreground">
          {t('settings.aiAgents.providerKeysTitle')}
        </div>
        <p className="m-0 text-muted-foreground">
          {t('settings.aiAgents.providerKeysDescription')}
        </p>
      </div>

      {(error || localError) && (
        <div className="mt-2 rounded-md border border-[var(--feedback-error-text)]/30 bg-[var(--feedback-error-bg)] px-2 py-1 text-[var(--feedback-error-text)]">
          {localError ?? error}
        </div>
      )}

      {loading && statuses.length === 0 ? (
        <div className="mt-3 text-muted-foreground">
          {t('settings.aiAgents.providerKeysLoading')}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {statuses.map((status) => {
            const draft = drafts[status.provider_id] ?? ''
            const busy = busyProvider === status.provider_id
            return (
              <div
                key={status.provider_id}
                className="grid gap-2 rounded-md border border-border/70 bg-background/35 p-2"
                data-testid={`settings-ai-provider-key-${status.provider_id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">{status.label}</div>
                    <code className="text-[10px] text-muted-foreground">{status.env_var}</code>
                  </div>
                  {keyStatusBadge(status, t)}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    autoComplete="off"
                    value={draft}
                    placeholder={AI_PROVIDER_KEY_PLACEHOLDER}
                    aria-label={t('settings.aiAgents.providerKeysInputLabel', {
                      provider: status.label,
                    })}
                    onChange={(event) => updateDraft(status.provider_id, event.target.value)}
                    data-testid={`settings-ai-provider-key-input-${status.provider_id}`}
                    className="min-w-0 bg-transparent"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!draft.trim() || busy}
                    onClick={() => void saveDraft(status.provider_id)}
                    data-testid={`settings-ai-provider-key-save-${status.provider_id}`}
                  >
                    {t('settings.aiAgents.providerKeysSave')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={status.source !== 'keychain' || busy}
                    onClick={() => void clearKey(status.provider_id)}
                    data-testid={`settings-ai-provider-key-clear-${status.provider_id}`}
                  >
                    {t('settings.aiAgents.providerKeysClear')}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
