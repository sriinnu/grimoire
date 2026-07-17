import { Fragment, useState } from 'react'
import {
  AI_PROVIDER_KEY_PLACEHOLDER,
  AI_PROVIDER_KEY_SOURCE_TONE,
  type AiProviderKeySource,
} from '../../lib/aiProviderKeys'
import { useAiProviderKeys } from '../../hooks/useAiProviderKeys'
import { desktopPlatformLabel, desktopSecureStorageLabel, getDesktopPlatform } from '../../utils/platform'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsRow,
} from './primitives/SettingsGroup'
import type { SettingsTranslate } from './settingsTypes'

function sourceLabel(source: AiProviderKeySource, t: SettingsTranslate, secureStore: string): string {
  if (source === 'keychain') return secureStore
  if (source === 'environment') return t('settings.aiAgents.providerKeysEnvironment')
  return t('settings.aiAgents.providerKeysMissing')
}

/** Renders redacted provider API-key rows backed by native secure storage. */
export function AiProviderKeysCard({ t }: { t: SettingsTranslate }) {
  const {
    statuses,
    loading,
    error,
    saveProviderApiKey,
    clearProviderApiKey,
  } = useAiProviderKeys()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [busyProvider, setBusyProvider] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const desktopPlatform = getDesktopPlatform()
  const canSaveSecureKeys = desktopPlatform === 'macos'
  const platform = desktopPlatformLabel(desktopPlatform)
  const secureStore = desktopSecureStorageLabel(desktopPlatform)

  const updateDraft = (providerId: string, value: string) => {
    setDrafts((current) => ({ ...current, [providerId]: value }))
  }

  const toggleEditor = (providerId: string) => {
    setLocalError(null)
    if (editingProvider === providerId) {
      setEditingProvider(null)
      setDrafts((current) => ({ ...current, [providerId]: '' }))
      return
    }
    setEditingProvider(providerId)
  }

  const saveDraft = async (providerId: string) => {
    const draft = drafts[providerId]?.trim() ?? ''
    if (!draft) return
    setBusyProvider(providerId)
    setLocalError(null)
    try {
      await saveProviderApiKey(providerId, draft)
      setDrafts((current) => ({ ...current, [providerId]: '' }))
      setEditingProvider((current) => (current === providerId ? null : current))
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
    <SettingsGroup
      title={t('settings.aiAgents.providerKeysTitle')}
      testId="settings-ai-provider-keys"
      footnote={canSaveSecureKeys
        ? t('settings.aiAgents.providerKeysDescription', { secureStore })
        : t('settings.aiAgents.providerKeysDescriptionUnavailable', { platform, secureStore })}
    >
      {(error || localError) ? (
        <SettingsRow fullWidth>
          <div className="text-[11px] leading-relaxed text-[var(--feedback-error-text)]">
            {localError ?? error}
          </div>
        </SettingsRow>
      ) : null}

      {loading && statuses.length === 0 ? (
        <SettingsRow description={t('settings.aiAgents.providerKeysLoading')} />
      ) : (
        statuses.map((status) => {
          const editing = editingProvider === status.provider_id
          const draft = drafts[status.provider_id] ?? ''
          const busy = busyProvider === status.provider_id
          return (
            <Fragment key={status.provider_id}>
              <SettingsActionRow
                label={status.label}
                testId={`settings-ai-provider-key-${status.provider_id}`}
                description={
                  <>
                    <code className="text-[10px]">{status.env_var}</code>
                    {' · '}
                    <span
                      className={`font-medium ${AI_PROVIDER_KEY_SOURCE_TONE[status.source]}`}
                      data-source={status.source}
                      data-testid={`settings-ai-provider-key-source-${status.provider_id}`}
                    >
                      {sourceLabel(status.source, t, secureStore)}
                    </span>
                  </>
                }
                actions={
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canSaveSecureKeys}
                      onClick={() => toggleEditor(status.provider_id)}
                      data-testid={`settings-ai-provider-key-edit-${status.provider_id}`}
                    >
                      {editing ? t('settings.cancel') : t('settings.aiAgents.providerKeysSet')}
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
                  </>
                }
              />
              {editing ? (
                <SettingsRow fullWidth testId={`settings-ai-provider-key-editor-${status.provider_id}`}>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={draft}
                      placeholder={AI_PROVIDER_KEY_PLACEHOLDER}
                      disabled={!canSaveSecureKeys}
                      aria-label={t('settings.aiAgents.providerKeysInputLabel', {
                        provider: status.label,
                      })}
                      onChange={(event) => updateDraft(status.provider_id, event.target.value)}
                      data-testid={`settings-ai-provider-key-input-${status.provider_id}`}
                      className="min-w-0 flex-1 bg-transparent"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!canSaveSecureKeys || !draft.trim() || busy}
                      onClick={() => void saveDraft(status.provider_id)}
                      data-testid={`settings-ai-provider-key-save-${status.provider_id}`}
                    >
                      {t('settings.aiAgents.providerKeysSave')}
                    </Button>
                  </div>
                </SettingsRow>
              ) : null}
            </Fragment>
          )
        })
      )}
    </SettingsGroup>
  )
}
