import {
  AI_AGENT_DEFINITIONS,
  resolveDefaultAiAgent,
  supportsAiAgentProviderRoute,
  type AiAgentId,
} from '../../lib/aiAgents'
import {
  resolveEditorFont,
  resolveNativeShellMaterial,
  resolveThemePreset,
} from '../../lib/appearance'
import { SYSTEM_UI_LANGUAGE, serializeUiLanguagePreference } from '../../lib/i18nCore'
import { normalizeReleaseChannel, serializeReleaseChannel } from '../../lib/releaseChannel'
import { trackEvent } from '../../lib/telemetry'
import {
  resolveConfiguredTranscriptionProvider,
} from '../../lib/transcriptionProviders'
import { DEFAULT_THEME_MODE, readStoredThemeMode, type ThemeMode } from '../../lib/themeMode'
import type { Settings } from '../../types'
import type { SettingsDraft } from './settingsTypes'

export const DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS = 90
export const DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS = 30

/** Returns a positive integer suitable for persisted settings, or a stable fallback. */
export function sanitizePositiveInteger(value: number | null | undefined, fallback: number): number {
  if (value === null || value === undefined || !Number.isFinite(value) || value < 1) return fallback
  return Math.round(value)
}

/** Creates the editable Settings draft shown in the modal. */
export function createSettingsDraft(
  settings: Settings,
  explicitOrganizationEnabled: boolean,
): SettingsDraft {
  return {
    pullInterval: settings.auto_pull_interval_minutes ?? 5,
    autoGitEnabled: settings.autogit_enabled ?? false,
    autoGitIdleThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_idle_threshold_seconds,
      DEFAULT_AUTOGIT_IDLE_THRESHOLD_SECONDS,
    ),
    autoGitInactiveThresholdSeconds: sanitizePositiveInteger(
      settings.autogit_inactive_threshold_seconds,
      DEFAULT_AUTOGIT_INACTIVE_THRESHOLD_SECONDS,
    ),
    autoAdvanceInboxAfterOrganize: settings.auto_advance_inbox_after_organize ?? false,
    defaultAiAgent: resolveDefaultAiAgent(settings.default_ai_agent),
    aiAgentModels: createAiAgentModelsDraft(settings.ai_agent_models),
    aiAgentProviders: createAiAgentProvidersDraft(settings.ai_agent_providers),
    releaseChannel: normalizeReleaseChannel(settings.release_channel),
    themeMode: resolveSettingsDraftThemeMode(settings.theme_mode),
    themePreset: resolveThemePreset(settings.theme_preset),
    editorFont: resolveEditorFont(settings.editor_font),
    uiLanguage: settings.ui_language ?? SYSTEM_UI_LANGUAGE,
    menuBarIconEnabled: settings.menu_bar_icon_enabled ?? false,
    nativeShellMaterial: resolveNativeShellMaterial(settings.native_shell_material),
    initialH1AutoRename: settings.initial_h1_auto_rename_enabled ?? true,
    crashReporting: settings.crash_reporting_enabled ?? false,
    analytics: settings.analytics_enabled ?? false,
    cloudTranscriptionEnabled: settings.cloud_transcription_enabled === true,
    transcriptionProvider: resolveConfiguredTranscriptionProvider({
      provider: settings.transcription_provider,
      cloudTranscriptionEnabled: settings.cloud_transcription_enabled,
    }),
    explicitOrganization: explicitOrganizationEnabled,
  }
}

/** Resolves the saved theme mode, falling back to the local browser mirror. */
export function resolveSettingsDraftThemeMode(themeMode: Settings['theme_mode']): ThemeMode {
  if (themeMode) return themeMode
  if (typeof window === 'undefined') return DEFAULT_THEME_MODE
  return readStoredThemeMode(window.localStorage) ?? DEFAULT_THEME_MODE
}

function resolveTelemetryConsent(settings: Settings, draft: SettingsDraft): boolean | null {
  if (draft.crashReporting || draft.analytics) return true
  return settings.telemetry_consent === null ? null : false
}

function resolveAnonymousId(settings: Settings, draft: SettingsDraft): string | null {
  if (draft.crashReporting || draft.analytics) {
    return settings.anonymous_id ?? crypto.randomUUID()
  }

  return settings.anonymous_id
}

/** Converts the draft back to the persisted Settings contract. */
export function buildSettingsFromDraft(settings: Settings, draft: SettingsDraft): Settings {
  return {
    auto_pull_interval_minutes: draft.pullInterval,
    autogit_enabled: draft.autoGitEnabled,
    autogit_idle_threshold_seconds: draft.autoGitIdleThresholdSeconds,
    autogit_inactive_threshold_seconds: draft.autoGitInactiveThresholdSeconds,
    auto_advance_inbox_after_organize: draft.autoAdvanceInboxAfterOrganize,
    telemetry_consent: resolveTelemetryConsent(settings, draft),
    crash_reporting_enabled: draft.crashReporting,
    analytics_enabled: draft.analytics,
    anonymous_id: resolveAnonymousId(settings, draft),
    release_channel: serializeReleaseChannel(draft.releaseChannel),
    theme_mode: draft.themeMode,
    theme_preset: draft.themePreset,
    editor_font: draft.editorFont,
    ui_language: serializeUiLanguagePreference(draft.uiLanguage),
    menu_bar_icon_enabled: draft.menuBarIconEnabled,
    native_shell_material: draft.nativeShellMaterial,
    initial_h1_auto_rename_enabled: draft.initialH1AutoRename,
    default_ai_agent: draft.defaultAiAgent,
    ai_agent_models: normalizeAiAgentModelsForSave(draft.aiAgentModels),
    ai_agent_providers: normalizeAiAgentProvidersForSave(draft.aiAgentProviders),
    transcription_provider: resolveConfiguredTranscriptionProvider({
      provider: draft.transcriptionProvider,
      cloudTranscriptionEnabled: draft.cloudTranscriptionEnabled,
    }),
    cloud_transcription_enabled: draft.cloudTranscriptionEnabled,
  }
}

function createAiAgentStringDraft(
  values: Settings['ai_agent_models'] | Settings['ai_agent_providers'],
): Partial<Record<AiAgentId, string>> {
  const draft: Partial<Record<AiAgentId, string>> = {}
  for (const definition of AI_AGENT_DEFINITIONS) {
    const value = values?.[definition.id]?.trim()
    if (value) draft[definition.id] = value
  }
  return draft
}

function createAiAgentModelsDraft(
  models: Settings['ai_agent_models'],
): Partial<Record<AiAgentId, string>> {
  return createAiAgentStringDraft(models)
}

function createAiAgentProvidersDraft(
  providers: Settings['ai_agent_providers'],
): Partial<Record<AiAgentId, string>> {
  const draft = createAiAgentStringDraft(providers)
  for (const agent of Object.keys(draft) as AiAgentId[]) {
    if (!supportsAiAgentProviderRoute(agent)) delete draft[agent]
  }
  return draft
}

function normalizeAiAgentModelsForSave(
  models: Partial<Record<AiAgentId, string>>,
): Settings['ai_agent_models'] {
  const saved = createAiAgentStringDraft(models)
  return Object.keys(saved).length > 0 ? saved : null
}

function normalizeAiAgentProvidersForSave(
  providers: Partial<Record<AiAgentId, string>>,
): Settings['ai_agent_providers'] {
  const saved = createAiAgentProvidersDraft(providers)
  return Object.keys(saved).length > 0 ? saved : null
}

/** Stores or clears the selected model override for one AI agent. */
export function updateAiAgentModelDraft(
  models: Partial<Record<AiAgentId, string>>,
  agent: AiAgentId,
  model: string,
): Partial<Record<AiAgentId, string>> {
  const next = { ...models }
  const normalized = model.trim()
  if (normalized) {
    next[agent] = normalized
  } else {
    delete next[agent]
  }
  return next
}

/** Stores or clears the selected provider override for one AI agent. */
export function updateAiAgentProviderDraft(
  providers: Partial<Record<AiAgentId, string>>,
  agent: AiAgentId,
  provider: string,
): Partial<Record<AiAgentId, string>> {
  const next = { ...providers }
  if (!supportsAiAgentProviderRoute(agent)) {
    delete next[agent]
    return next
  }

  const normalized = provider.trim()
  if (normalized) {
    next[agent] = normalized
  } else {
    delete next[agent]
  }
  return next
}

/** Emits opt-in/out analytics events when the saved telemetry choice changes. */
export function trackTelemetryConsentChange(previousAnalytics: boolean, nextAnalytics: boolean): void {
  if (!previousAnalytics && nextAnalytics) trackEvent('telemetry_opted_in')
  if (previousAnalytics && !nextAnalytics) trackEvent('telemetry_opted_out')
}
