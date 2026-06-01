/** Supported speech-to-text backends for turning audio attachments into notes. */
export type TranscriptionProviderId = 'local_whisper' | 'whisper_api' | 'local_voice_model'

/** Static provider metadata used by settings, import flows, and native commands. */
export interface TranscriptionProviderDefinition {
  id: TranscriptionProviderId
  label: string
  localFirst: boolean
  requiresApiKey: boolean
  supportsTimestamps: boolean
}

/** User preference used to resolve the runtime transcription backend. */
export interface TranscriptionProviderPreference {
  provider?: unknown
  cloudTranscriptionEnabled?: boolean | null
}

/** Native command args that make cloud transport explicit. */
export interface TranscriptionRequestConfig {
  provider: TranscriptionProviderId
  allowCloud: boolean
}

/** Local-first default so voice notes work without cloud configuration. */
export const DEFAULT_TRANSCRIPTION_PROVIDER: TranscriptionProviderId = 'local_whisper'

/** Provider registry for the upcoming audio attachment transcription flow. */
export const TRANSCRIPTION_PROVIDERS: readonly TranscriptionProviderDefinition[] = [
  {
    id: 'local_whisper',
    label: 'Local Whisper',
    localFirst: true,
    requiresApiKey: false,
    supportsTimestamps: true,
  },
  {
    id: 'whisper_api',
    label: 'Whisper API',
    localFirst: false,
    requiresApiKey: true,
    supportsTimestamps: true,
  },
  {
    id: 'local_voice_model',
    label: 'Local voice model',
    localFirst: true,
    requiresApiKey: false,
    supportsTimestamps: false,
  },
]

const PROVIDER_IDS = new Set(TRANSCRIPTION_PROVIDERS.map((provider) => provider.id))

/** Returns a supported transcription provider ID or null for untrusted values. */
export function normalizeTranscriptionProvider(value: unknown): TranscriptionProviderId | null {
  return typeof value === 'string' && PROVIDER_IDS.has(value as TranscriptionProviderId)
    ? value as TranscriptionProviderId
    : null
}

/** Resolves unknown provider input to the local-first default. */
export function resolveTranscriptionProvider(value: unknown): TranscriptionProviderId {
  return normalizeTranscriptionProvider(value) ?? DEFAULT_TRANSCRIPTION_PROVIDER
}

/** Returns provider metadata for a supported transcription provider. */
export function getTranscriptionProviderDefinition(
  providerId: TranscriptionProviderId,
): TranscriptionProviderDefinition {
  return TRANSCRIPTION_PROVIDERS.find((provider) => provider.id === providerId)
    ?? TRANSCRIPTION_PROVIDERS[0]!
}

/** True when a provider can send audio off-device. */
export function isCloudTranscriptionProvider(providerId: TranscriptionProviderId): boolean {
  const provider = getTranscriptionProviderDefinition(providerId)
  return !provider.localFirst || provider.requiresApiKey
}

/** Resolves settings into the provider Grimoire is allowed to call right now. */
export function resolveConfiguredTranscriptionProvider(
  preference: TranscriptionProviderPreference = {},
): TranscriptionProviderId {
  const provider = resolveTranscriptionProvider(preference.provider)
  if (isCloudTranscriptionProvider(provider) && preference.cloudTranscriptionEnabled !== true) {
    return DEFAULT_TRANSCRIPTION_PROVIDER
  }
  return provider
}

/** Builds native command config with cloud disabled unless the user opted in. */
export function createTranscriptionRequestConfig(
  preference: TranscriptionProviderPreference = {},
): TranscriptionRequestConfig {
  const provider = resolveConfiguredTranscriptionProvider(preference)
  return {
    provider,
    allowCloud: isCloudTranscriptionProvider(provider) && preference.cloudTranscriptionEnabled === true,
  }
}
