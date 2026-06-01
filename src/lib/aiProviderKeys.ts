/** Storage source Grimoire can safely disclose for a provider key without exposing the secret. */
export type AiProviderKeySource = 'keychain' | 'environment' | 'missing'

/** Redacted readiness state for a provider API key. */
export interface AiProviderKeyStatus {
  provider_id: string
  label: string
  env_var: string
  configured: boolean
  source: AiProviderKeySource
}

/** Theme text tone used for provider key source badges. */
export const AI_PROVIDER_KEY_SOURCE_TONE: Record<AiProviderKeySource, string> = {
  keychain: 'text-[var(--feedback-success-text)]',
  environment: 'text-[var(--feedback-info-text)]',
  missing: 'text-muted-foreground',
}

/** Placeholder that hints at secret shape without implying a specific provider value. */
export const AI_PROVIDER_KEY_PLACEHOLDER = 'sk-...'
