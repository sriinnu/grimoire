import { resolveFrontendTelemetryConfig } from './telemetryConfig'

/** Pattern that matches absolute file paths (macOS / Linux / Windows). */
const PATH_PATTERN = /(?:\/[\w.-]+){2,}|[A-Z]:\\[\w\\.-]+/g
type SentryModule = typeof import('@sentry/react')
type SentryErrorEvent = import('@sentry/react').ErrorEvent

function scrubPaths(input: string): string {
  return input.replace(PATH_PATTERN, '<redacted-path>')
}

function scrubSentryEvent(event: SentryErrorEvent): SentryErrorEvent {
  if (event.message) event.message = scrubPaths(event.message)
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = scrubPaths(ex.value)
  }
  for (const breadcrumb of event.breadcrumbs ?? []) {
    if (breadcrumb.message) breadcrumb.message = scrubPaths(breadcrumb.message)
  }
  return event
}

let sentryInitialized = false
let sentryLifecycleVersion = 0
let sentryImport: Promise<SentryModule> | null = null
let posthogInstance: typeof import('posthog-js').default | null = null

function loadSentry(): Promise<SentryModule> {
  sentryImport ??= import('@sentry/react')
  return sentryImport
}

export async function initSentry(anonymousId: string): Promise<void> {
  const initVersion = ++sentryLifecycleVersion

  const { sentryDsn } = resolveFrontendTelemetryConfig()
  if (!sentryDsn) return

  const Sentry = await loadSentry()
  if (initVersion !== sentryLifecycleVersion) return

  if (sentryInitialized) {
    Sentry.setUser({ id: anonymousId })
    return
  }

  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    beforeSend: scrubSentryEvent,
  })
  Sentry.setUser({ id: anonymousId })
  sentryInitialized = true
}

export async function teardownSentry(): Promise<void> {
  const teardownVersion = ++sentryLifecycleVersion
  if (!sentryInitialized) return
  const Sentry = await loadSentry()
  if (teardownVersion !== sentryLifecycleVersion) return
  await Sentry.close()
  sentryInitialized = false
}

export async function initPostHog(anonymousId: string, releaseChannel?: string): Promise<void> {
  if (posthogInstance) return

  const { posthogKey, posthogHost } = resolveFrontendTelemetryConfig()
  if (!posthogKey || !posthogHost) return

  const posthog = (await import('posthog-js')).default
  posthog.init(posthogKey, {
    api_host: posthogHost,
    autocapture: false,
    capture_pageview: false,
    persistence: 'memory',
    disable_session_recording: true,
  })
  posthog.identify(anonymousId, releaseChannel ? { release_channel: releaseChannel } : undefined)
  posthogInstance = posthog
}

export function teardownPostHog(): void {
  if (!posthogInstance) return
  posthogInstance.opt_out_capturing()
  posthogInstance.reset()
  posthogInstance = null
}

export function updatePostHogIdentify(releaseChannel: string): void {
  posthogInstance?.identify(undefined, { release_channel: releaseChannel })
}

/** Hardcoded defaults for first launch with no network (PostHog cache empty). */
const FEATURE_DEFAULTS: Record<string, boolean> = {}

let currentReleaseChannel: string = 'stable'

export function setReleaseChannel(channel: string): void {
  currentReleaseChannel = channel
}

export function isFeatureEnabled(flagKey: string): boolean {
  if (currentReleaseChannel === 'alpha') return true
  return posthogInstance?.isFeatureEnabled(flagKey) ?? FEATURE_DEFAULTS[flagKey] ?? false
}

export function trackEvent(name: string, properties?: Record<string, string | number>): void {
  posthogInstance?.capture(name, properties)
}

export function _resetTelemetryStateForTest(): void {
  sentryInitialized = false
  sentryLifecycleVersion = 0
  sentryImport = null
  posthogInstance = null
  currentReleaseChannel = 'stable'
}

export { scrubPaths as _scrubPathsForTest }
