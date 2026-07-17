import { useState } from 'react'
import { AI_PROVIDER_KEY_SOURCE_TONE, type AiProviderKeySource } from '../../lib/aiProviderKeys'
import {
  describeChitraguptaSocketStatus,
  type ChitraguptaSocketTokenStatus,
} from '../../lib/chitraguptaSocket'
import { chitraguptaSocketCall, useChitraguptaPairing } from '../../hooks/useChitraguptaPairing'
import { desktopSecureStorageLabel, getDesktopPlatform } from '../../utils/platform'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsRow,
} from './primitives/SettingsGroup'
import type { SettingsTranslate } from './settingsTypes'

function tokenSourceLabel(source: AiProviderKeySource, t: SettingsTranslate, secureStore: string): string {
  if (source === 'keychain') return secureStore
  if (source === 'environment') return t('settings.aiAgents.providerKeysEnvironment')
  return t('settings.aiAgents.providerKeysMissing')
}

/**
 * Daemon socket readiness, one-click pairing, and manual token entry as one
 * HIG group. The token is write-only from this card: Grimoire only ever reads
 * back redacted presence/source booleans, and pairing errors arrive
 * pre-sanitized.
 */
export function ChitraguptaSocketCard({ t }: { t: SettingsTranslate }) {
  const {
    status,
    phase,
    error: pairingError,
    connect,
    checkConnection,
    refreshStatus,
  } = useChitraguptaPairing()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const desktopPlatform = getDesktopPlatform()
  const canSaveSecureKeys = desktopPlatform === 'macos'
  const secureStore = desktopSecureStorageLabel(desktopPlatform)

  const saveToken = async () => {
    const token = draft.trim()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await chitraguptaSocketCall<ChitraguptaSocketTokenStatus>('save_chitragupta_socket_token', { token })
      setDraft('')
      await refreshStatus()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setBusy(false)
    }
  }

  const clearToken = async () => {
    setBusy(true)
    setError(null)
    try {
      await chitraguptaSocketCall<ChitraguptaSocketTokenStatus>('clear_chitragupta_socket_token')
      await refreshStatus()
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError))
    } finally {
      setBusy(false)
    }
  }

  const tokenSource = status?.token_source ?? 'missing'
  const provisioning = phase === 'provisioning'
  const displayError = error ?? pairingError

  return (
    <SettingsGroup
      title={t('settings.aiAgents.chitraguptaSocketTitle')}
      testId="settings-chitragupta-socket"
      footnote={t('settings.aiAgents.chitraguptaSocketDescription')}
    >
      <SettingsRow
        label={(
          <span data-testid="settings-chitragupta-socket-status">
            {describeChitraguptaSocketStatus(status)}
          </span>
        )}
        description={displayError
          ? <span className="text-[var(--feedback-error-text)]">{displayError}</span>
          : undefined}
      />

      <SettingsActionRow
        stacked
        label={t('settings.aiAgents.chitraguptaSocketConnect')}
        description={phase === 'waiting'
          ? (
            <span data-testid="settings-chitragupta-socket-waiting">
              {t('settings.aiAgents.chitraguptaSocketWaiting')}
            </span>
          )
          : t('settings.aiAgents.chitraguptaSocketConnectHint', { secureStore })}
        actions={
          <>
            {phase === 'waiting' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void checkConnection()}
                data-testid="settings-chitragupta-socket-check"
              >
                {t('settings.aiAgents.chitraguptaSocketCheck')}
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={!canSaveSecureKeys || busy || provisioning}
              onClick={() => void connect()}
              data-testid="settings-chitragupta-socket-connect"
            >
              {provisioning
                ? t('settings.aiAgents.chitraguptaSocketConnecting')
                : t('settings.aiAgents.chitraguptaSocketConnect')}
            </Button>
          </>
        }
      />

      <SettingsActionRow
        label={t('settings.aiAgents.chitraguptaSocketTokenLabel')}
        description={(
          <span
            className={`font-medium ${AI_PROVIDER_KEY_SOURCE_TONE[tokenSource]}`}
            data-source={tokenSource}
            data-testid="settings-chitragupta-socket-token-source"
          >
            {tokenSourceLabel(tokenSource, t, secureStore)}
          </span>
        )}
        actions={
          <>
            <Input
              type="password"
              autoComplete="off"
              value={draft}
              placeholder="chg_..."
              disabled={!canSaveSecureKeys}
              aria-label={t('settings.aiAgents.chitraguptaSocketTokenLabel')}
              onChange={(event) => setDraft(event.target.value)}
              data-testid="settings-chitragupta-socket-token-input"
              className="w-40 bg-transparent"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!canSaveSecureKeys || !draft.trim() || busy}
              onClick={() => void saveToken()}
              data-testid="settings-chitragupta-socket-token-save"
            >
              {t('settings.aiAgents.providerKeysSave')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={tokenSource !== 'keychain' || busy}
              onClick={() => void clearToken()}
              data-testid="settings-chitragupta-socket-token-clear"
            >
              {t('settings.aiAgents.providerKeysClear')}
            </Button>
          </>
        }
      />
    </SettingsGroup>
  )
}
