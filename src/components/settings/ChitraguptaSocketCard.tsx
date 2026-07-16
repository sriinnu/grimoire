import { useCallback, useEffect, useState } from 'react'
import { invoke } from '../../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../../mock-tauri'
import { AI_PROVIDER_KEY_SOURCE_TONE, type AiProviderKeySource } from '../../lib/aiProviderKeys'
import {
  describeChitraguptaSocketStatus,
  type ChitraguptaSocketStatus,
  type ChitraguptaSocketTokenStatus,
} from '../../lib/chitraguptaSocket'
import { desktopSecureStorageLabel, getDesktopPlatform } from '../../utils/platform'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { SettingsTranslate } from './settingsTypes'

function socketCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function tokenSourceLabel(source: AiProviderKeySource, t: SettingsTranslate, secureStore: string): string {
  if (source === 'keychain') return secureStore
  if (source === 'environment') return t('settings.aiAgents.providerKeysEnvironment')
  return t('settings.aiAgents.providerKeysMissing')
}

/**
 * Daemon socket readiness and token entry. The token is write-only from this
 * card: Grimoire only ever reads back redacted presence/source booleans.
 */
export function ChitraguptaSocketCard({ t }: { t: SettingsTranslate }) {
  const [status, setStatus] = useState<ChitraguptaSocketStatus | null>(null)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const desktopPlatform = getDesktopPlatform()
  const canSaveSecureKeys = desktopPlatform === 'macos'
  const secureStore = desktopSecureStorageLabel(desktopPlatform)

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await socketCall<ChitraguptaSocketStatus>('get_chitragupta_socket_status'))
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : String(statusError))
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const saveToken = async () => {
    const token = draft.trim()
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      await socketCall<ChitraguptaSocketTokenStatus>('save_chitragupta_socket_token', { token })
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
      await socketCall<ChitraguptaSocketTokenStatus>('clear_chitragupta_socket_token')
      await refreshStatus()
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError))
    } finally {
      setBusy(false)
    }
  }

  const tokenSource = status?.token_source ?? 'missing'

  return (
    <section
      className="settings-material-card rounded-md border px-3 py-3 text-[11px] leading-relaxed"
      data-testid="settings-chitragupta-socket"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs font-semibold text-foreground">
          {t('settings.aiAgents.chitraguptaSocketTitle')}
        </div>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
          data-testid="settings-chitragupta-socket-status"
        >
          {describeChitraguptaSocketStatus(status)}
        </span>
      </div>
      <p className="m-0 mt-1 text-muted-foreground">
        {t('settings.aiAgents.chitraguptaSocketDescription')}
      </p>

      {error && (
        <div className="mt-2 rounded-md border border-[var(--feedback-error-text)]/30 bg-[var(--feedback-error-bg)] px-2 py-1 text-[var(--feedback-error-text)]">
          {error}
        </div>
      )}

      <div className="mt-3 grid gap-2 rounded-md border border-border/70 bg-background/35 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-medium text-foreground">
            {t('settings.aiAgents.chitraguptaSocketTokenLabel')}
          </div>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${AI_PROVIDER_KEY_SOURCE_TONE[tokenSource]}`}
            data-source={tokenSource}
            data-testid="settings-chitragupta-socket-token-source"
          >
            {tokenSourceLabel(tokenSource, t, secureStore)}
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            type="password"
            autoComplete="off"
            value={draft}
            placeholder="chg_..."
            disabled={!canSaveSecureKeys}
            aria-label={t('settings.aiAgents.chitraguptaSocketTokenLabel')}
            onChange={(event) => setDraft(event.target.value)}
            data-testid="settings-chitragupta-socket-token-input"
            className="min-w-0 bg-transparent"
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
        </div>
      </div>
    </section>
  )
}
