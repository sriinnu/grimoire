import {
  MOTION_TOKENS,
  THEME_MOTION_PROFILES,
  type ThemeMotionProfile,
} from './themeRuntimeProfiles'

export const APPLE_MOTION_PRIMITIVES = [
  'fast',
  'base',
  'panel',
  'control',
  'pageSettle',
  'inkSettle',
  'statePulse',
  'hoverLift',
] as const

export const APPLE_MOTION_CURVES = {
  cinematic: {
    cssVariable: '--motion-ease-cinematic',
    swiftUIExpression: 'Animation.timingCurve(0.37, 0, 0.63, 1, duration: duration)',
  },
  expressive: {
    cssVariable: '--motion-ease-expressive',
    swiftUIExpression: 'Animation.timingCurve(0.34, 1.56, 0.64, 1, duration: duration)',
  },
  standard: {
    cssVariable: '--motion-ease-standard',
    swiftUIExpression: 'Animation.timingCurve(0.2, 0, 0, 1, duration: duration)',
  },
} as const

/** Named motion primitive shared by CSS and Apple shell implementations. */
export type AppleMotionPrimitive = typeof APPLE_MOTION_PRIMITIVES[number]

/** Curve family that maps Grimoire CSS easing to SwiftUI animation factories. */
export type AppleMotionCurveName = keyof typeof APPLE_MOTION_CURVES

/** Platform-neutral timing entry for SwiftUI/UIKit shell implementations. */
export interface AppleMotionTiming {
  curve: AppleMotionCurveName
  cssVariable: string
  durationSeconds: number
  primitive: AppleMotionPrimitive
  swiftUIExpression: string
}

/** Platform-neutral distance entry for SwiftUI/UIKit shell implementations. */
export interface AppleMotionDistance {
  cssVariable: string
  points: number
  primitive: AppleMotionPrimitive
}

/** One theme-pack motion profile translated out of CSS variable units. */
export interface AppleMotionBridgeProfile {
  distances: Record<'control' | 'hoverLift' | 'inkSettle' | 'pageSettle' | 'panel', AppleMotionDistance>
  profile: ThemeMotionProfile
  reducedMotionPolicy: {
    durationSeconds: 0
    keepInformationVisible: true
    swiftUIAnimation: 'nil'
  }
  timings: Record<AppleMotionPrimitive, AppleMotionTiming>
}

const TIMING_TOKEN_BY_PRIMITIVE: Record<AppleMotionPrimitive, string> = {
  base: '--motion-duration-base',
  control: '--motion-duration-control',
  fast: '--motion-duration-fast',
  hoverLift: '--motion-duration-hover',
  inkSettle: '--motion-duration-ink-settle',
  pageSettle: '--motion-duration-page-settle',
  panel: '--motion-duration-panel',
  statePulse: '--motion-duration-state-pulse',
}

const DISTANCE_TOKEN_BY_PRIMITIVE: AppleMotionBridgeProfile['distances'] = {
  control: buildDistancePlaceholder('control', '--motion-distance-control-y'),
  hoverLift: buildDistancePlaceholder('hoverLift', '--motion-hover-lift-distance'),
  inkSettle: buildDistancePlaceholder('inkSettle', '--motion-distance-ink-y'),
  pageSettle: buildDistancePlaceholder('pageSettle', '--motion-distance-page-y'),
  panel: buildDistancePlaceholder('panel', '--motion-distance-panel-y'),
}

const CURVE_BY_PRIMITIVE: Record<AppleMotionPrimitive, AppleMotionCurveName> = {
  base: 'standard',
  control: 'standard',
  fast: 'standard',
  hoverLift: 'standard',
  inkSettle: 'cinematic',
  pageSettle: 'cinematic',
  panel: 'standard',
  statePulse: 'standard',
}

function buildDistancePlaceholder(
  primitive: keyof AppleMotionBridgeProfile['distances'],
  cssVariable: string,
): AppleMotionDistance {
  return { cssVariable, points: 0, primitive }
}

function parseMilliseconds(value: string, token: string): number {
  const match = value.match(/^(-?\d+(?:\.\d+)?)ms$/u)
  if (!match) throw new Error(`${token} must be expressed in milliseconds.`)
  return Number(match[1]) / 1000
}

function parsePoints(value: string, token: string): number {
  const match = value.match(/^(-?\d+(?:\.\d+)?)px$/u)
  if (!match) throw new Error(`${token} must be expressed in pixels.`)
  return Number(match[1])
}

function timingForPrimitive(
  profile: ThemeMotionProfile,
  primitive: AppleMotionPrimitive,
): AppleMotionTiming {
  const cssVariable = TIMING_TOKEN_BY_PRIMITIVE[primitive]
  const durationSeconds = parseMilliseconds(MOTION_TOKENS[profile][cssVariable], cssVariable)
  const curve = CURVE_BY_PRIMITIVE[primitive]

  return {
    curve,
    cssVariable,
    durationSeconds,
    primitive,
    swiftUIExpression: APPLE_MOTION_CURVES[curve].swiftUIExpression.replace(
      'duration: duration',
      `duration: ${durationSeconds.toFixed(2)}`,
    ),
  }
}

function distanceForPrimitive(
  profile: ThemeMotionProfile,
  primitive: keyof AppleMotionBridgeProfile['distances'],
): AppleMotionDistance {
  const cssVariable = DISTANCE_TOKEN_BY_PRIMITIVE[primitive].cssVariable
  return {
    cssVariable,
    points: parsePoints(MOTION_TOKENS[profile][cssVariable], cssVariable),
    primitive,
  }
}

/** Converts one validated theme motion profile into Apple-shell constants. */
export function getAppleMotionBridgeProfile(profile: ThemeMotionProfile): AppleMotionBridgeProfile {
  return {
    profile,
    timings: Object.fromEntries(
      APPLE_MOTION_PRIMITIVES.map((primitive) => [primitive, timingForPrimitive(profile, primitive)]),
    ) as AppleMotionBridgeProfile['timings'],
    distances: {
      control: distanceForPrimitive(profile, 'control'),
      hoverLift: distanceForPrimitive(profile, 'hoverLift'),
      inkSettle: distanceForPrimitive(profile, 'inkSettle'),
      pageSettle: distanceForPrimitive(profile, 'pageSettle'),
      panel: distanceForPrimitive(profile, 'panel'),
    },
    reducedMotionPolicy: {
      durationSeconds: 0,
      keepInformationVisible: true,
      swiftUIAnimation: 'nil',
    },
  }
}

/** Exports every theme-pack motion profile for future macOS/iOS shell codegen. */
export function getAppleMotionBridgeProfiles(): Record<ThemeMotionProfile, AppleMotionBridgeProfile> {
  return Object.fromEntries(
    THEME_MOTION_PROFILES.map((profile) => [profile, getAppleMotionBridgeProfile(profile)]),
  ) as Record<ThemeMotionProfile, AppleMotionBridgeProfile>
}
