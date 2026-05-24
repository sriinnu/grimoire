import { beforeEach, describe, expect, it, vi } from 'vitest'

const telemetryMocks = vi.hoisted(() => ({
  sentryClose: vi.fn(),
  sentryInit: vi.fn(),
  sentrySetUser: vi.fn(),
}))

vi.mock('./telemetryConfig', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./telemetryConfig')>()
  return {
    ...actual,
    resolveFrontendTelemetryConfig: () => ({
      posthogHost: null,
      posthogKey: '',
      sentryDsn: 'https://public@example.ingest.sentry.io/123456',
    }),
  }
})

vi.mock('@sentry/react', () => ({
  close: telemetryMocks.sentryClose,
  init: telemetryMocks.sentryInit,
  setUser: telemetryMocks.sentrySetUser,
}))

import {
  _resetTelemetryStateForTest,
  _scrubPathsForTest as scrubPaths,
  initSentry,
  isFeatureEnabled,
  setReleaseChannel,
  teardownSentry,
  trackEvent,
} from './telemetry'

beforeEach(() => {
  vi.clearAllMocks()
  _resetTelemetryStateForTest()
})

describe('telemetry scrubPaths', () => {
  it('redacts macOS absolute paths', () => {
    expect(scrubPaths('Error in /Users/srinivas/Grimoire/note.md')).toBe(
      'Error in <redacted-path>'
    )
  })

  it('redacts Linux absolute paths', () => {
    expect(scrubPaths('Error in /home/user/vault/note.md')).toBe(
      'Error in <redacted-path>'
    )
  })

  it('redacts Windows paths', () => {
    expect(scrubPaths('Error in C:\\Users\\luca\\docs\\file.md')).toBe(
      'Error in <redacted-path>'
    )
  })

  it('leaves non-path strings untouched', () => {
    expect(scrubPaths('Something went wrong')).toBe('Something went wrong')
  })

  it('redacts multiple paths in one string', () => {
    const input = 'Failed copying /a/b/c to /x/y/z'
    expect(scrubPaths(input)).toBe('Failed copying <redacted-path> to <redacted-path>')
  })
})

describe('trackEvent', () => {
  it('does not throw when PostHog is not initialized', () => {
    expect(() => trackEvent('test_event', { count: 1 })).not.toThrow()
  })

  it('accepts event name with no properties', () => {
    expect(() => trackEvent('note_created')).not.toThrow()
  })

  it('accepts event name with string and number properties', () => {
    expect(() => trackEvent('note_created', { has_type: 1, creation_path: 'cmd_n' })).not.toThrow()
  })
})

describe('Sentry lifecycle', () => {
  it('initializes crash reporting when no teardown interrupts it', async () => {
    await initSentry('test-uuid')

    expect(telemetryMocks.sentryInit).toHaveBeenCalledOnce()
    expect(telemetryMocks.sentrySetUser).toHaveBeenCalledWith({ id: 'test-uuid' })
  })

  it('cancels a pending crash-reporting init when teardown wins the race', async () => {
    const pendingInit = initSentry('test-uuid')

    await teardownSentry()
    await pendingInit

    expect(telemetryMocks.sentryInit).not.toHaveBeenCalled()
    expect(telemetryMocks.sentrySetUser).not.toHaveBeenCalled()
  })

  it('closes crash reporting after initialization', async () => {
    await initSentry('test-uuid')
    await teardownSentry()

    expect(telemetryMocks.sentryClose).toHaveBeenCalledOnce()
  })
})

describe('isFeatureEnabled', () => {
  it('returns true for alpha channel regardless of flag state', () => {
    setReleaseChannel('alpha')
    expect(isFeatureEnabled('any_flag')).toBe(true)
    expect(isFeatureEnabled('nonexistent_flag')).toBe(true)
  })

  it('returns false for stable channel when PostHog is not initialized', () => {
    setReleaseChannel('stable')
    expect(isFeatureEnabled('some_flag')).toBe(false)
  })

  it('returns false for beta channel when PostHog is not initialized', () => {
    setReleaseChannel('beta')
    expect(isFeatureEnabled('some_flag')).toBe(false)
  })
})
