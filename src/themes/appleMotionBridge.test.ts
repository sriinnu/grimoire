import { describe, expect, it } from 'vitest'
import {
  APPLE_MOTION_PRIMITIVES,
  getAppleMotionBridgeProfile,
  getAppleMotionBridgeProfiles,
} from './appleMotionBridge'
import {
  MOTION_TOKENS,
  THEME_MOTION_PROFILES,
  type ThemeMotionProfile,
} from './themeRuntimeProfiles'

function secondsFromMs(value: string): number {
  return Number(value.replace('ms', '')) / 1000
}

function pointsFromPx(value: string): number {
  return Number(value.replace('px', ''))
}

describe('Apple motion bridge', () => {
  it('exports one bridge profile for every local theme-pack motion profile', () => {
    const bridge = getAppleMotionBridgeProfiles()

    expect(Object.keys(bridge).sort()).toEqual([...THEME_MOTION_PROFILES].sort())
    for (const profile of THEME_MOTION_PROFILES) {
      expect(bridge[profile].profile).toBe(profile)
    }
  })

  it.each(THEME_MOTION_PROFILES)('maps CSS motion durations for %s into SwiftUI seconds', (profile) => {
    const bridge = getAppleMotionBridgeProfile(profile)

    expect(Object.keys(bridge.timings).sort()).toEqual([...APPLE_MOTION_PRIMITIVES].sort())
    expect(bridge.timings.fast.durationSeconds).toBe(secondsFromMs(MOTION_TOKENS[profile]['--motion-duration-fast']))
    expect(bridge.timings.panel.durationSeconds).toBe(secondsFromMs(MOTION_TOKENS[profile]['--motion-duration-panel']))
    expect(bridge.timings.pageSettle.durationSeconds).toBe(secondsFromMs(MOTION_TOKENS[profile]['--motion-duration-page-settle']))
    expect(bridge.timings.inkSettle.curve).toBe('cinematic')
    expect(bridge.timings.panel.curve).toBe('standard')
    expect(bridge.timings.control.swiftUIExpression).toContain('Animation.timingCurve')
  })

  it.each(THEME_MOTION_PROFILES)('maps CSS motion distances for %s into Apple points', (profile) => {
    const bridge = getAppleMotionBridgeProfile(profile)

    expect(bridge.distances.panel.points).toBe(pointsFromPx(MOTION_TOKENS[profile]['--motion-distance-panel-y']))
    expect(bridge.distances.control.points).toBe(pointsFromPx(MOTION_TOKENS[profile]['--motion-distance-control-y']))
    expect(bridge.distances.pageSettle.points).toBe(pointsFromPx(MOTION_TOKENS[profile]['--motion-distance-page-y']))
    expect(bridge.distances.inkSettle.points).toBe(pointsFromPx(MOTION_TOKENS[profile]['--motion-distance-ink-y']))
    expect(bridge.distances.hoverLift.points).toBe(pointsFromPx(MOTION_TOKENS[profile]['--motion-hover-lift-distance']))
  })

  it('keeps reduced motion as an information-preserving Apple shell policy', () => {
    const bridge = getAppleMotionBridgeProfile('standard' satisfies ThemeMotionProfile)

    expect(bridge.reducedMotionPolicy).toEqual({
      durationSeconds: 0,
      keepInformationVisible: true,
      swiftUIAnimation: 'nil',
    })
  })
})
