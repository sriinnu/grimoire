import { useCallback, useEffect, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import { normalizeStoredAiAgent } from '../lib/aiAgents'
import { normalizeEditorFont, normalizeNativeShellMaterial, normalizeThemePreset } from '../lib/appearance'
import { serializeUiLanguagePreference } from '../lib/i18nCore'
import { normalizeReleaseChannel, serializeReleaseChannel } from '../lib/releaseChannel'
import { resolveConfiguredTranscriptionProvider } from '../lib/transcriptionProviderConfig'
import { normalizeThemeMode } from '../lib/themeMode'
import type { Settings } from '../types'

async function invokeNativeIfAvailable<T>(command: string, tauriArgs: Record<string, unknown>): Promise<T | undefined> {
  try {
    return await invoke<T>(command, tauriArgs)
  } catch (err) {
    if (isTauri()) throw err
    return undefined
  }
}

async function tauriCall<T>(command: string, tauriArgs: Record<string, unknown>, mockArgs?: Record<string, unknown>): Promise<T> {
  if (isTauri()) return invoke<T>(command, tauriArgs)

  const nativeResult = await invokeNativeIfAvailable<T>(command, tauriArgs)
  if (nativeResult !== undefined) return nativeResult

  return mockInvoke<T>(command, mockArgs ?? tauriArgs)
}

const EMPTY_SETTINGS: Settings = {
  auto_pull_interval_minutes: null,
  autogit_enabled: null,
  autogit_idle_threshold_seconds: null,
  autogit_inactive_threshold_seconds: null,
  auto_advance_inbox_after_organize: null,
  telemetry_consent: null,
  crash_reporting_enabled: null,
  analytics_enabled: null,
  anonymous_id: null,
  release_channel: null,
  theme_mode: null,
  theme_preset: null,
  editor_font: null,
  ui_language: null,
  menu_bar_icon_enabled: null,
  native_shell_material: null,
  default_ai_agent: null,
  transcription_provider: null,
  cloud_transcription_enabled: null,
}

function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    release_channel: serializeReleaseChannel(
      normalizeReleaseChannel(settings.release_channel),
    ),
    theme_mode: normalizeThemeMode(settings.theme_mode),
    theme_preset: normalizeThemePreset(settings.theme_preset),
    editor_font: normalizeEditorFont(settings.editor_font),
    native_shell_material: normalizeNativeShellMaterial(settings.native_shell_material),
    ui_language: serializeUiLanguagePreference(settings.ui_language),
    default_ai_agent: normalizeStoredAiAgent(settings.default_ai_agent),
    cloud_transcription_enabled: settings.cloud_transcription_enabled === true,
    transcription_provider: resolveConfiguredTranscriptionProvider({
      provider: settings.transcription_provider,
      cloudTranscriptionEnabled: settings.cloud_transcription_enabled,
    }),
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(EMPTY_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  const loadSettings = useCallback(async () => {
    try {
      const s = await tauriCall<Settings>('get_settings', {})
      setSettings(normalizeSettings(s))
    } catch (err) {
      console.warn('Failed to load settings:', err)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveSettings = useCallback(async (newSettings: Settings) => {
    const normalizedSettings = normalizeSettings(newSettings)
    try {
      await tauriCall<null>('save_settings', { settings: normalizedSettings })
      setSettings(normalizedSettings)
    } catch (err) {
      console.error('Failed to save settings:', err)
    }
  }, [])

  return { settings, loaded, saveSettings }
}
