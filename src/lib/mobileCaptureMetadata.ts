import type { VaultEntry } from '../types'

export type MobileReviewLane = 'Dream' | 'Journal' | 'Memory' | 'Note' | 'Task' | 'Mobile'
export type MobileReviewState = 'blocked' | 'pending'

export interface MobileReviewItem {
  capturedAt: number | null
  lane: MobileReviewLane
  path: string
  reviewState: MobileReviewState
}

const CLOSED_REVIEW_VALUES = new Set(['accepted', 'closed', 'discarded', 'done', 'finished', 'merged', 'moved', 'reviewed'])
const BLOCKED_REVIEW_VALUES = new Set(['blocked', 'needs-review', 'needs_attention'])

function normalizedPropertyValues(value: VaultEntry['properties'][string] | undefined): string[] {
  if (value === null || value === undefined) return []
  const values = Array.isArray(value) ? value : [value]
  return values.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
}

function propertyTimestamp(value: VaultEntry['properties'][string] | undefined): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const timestamp = propertyTimestamp(item)
      if (timestamp) return timestamp
    }
    return null
  }
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

function reviewLane(entry: VaultEntry): MobileReviewLane {
  const lane = entry.isA?.trim().toLowerCase()
  if (lane === 'dream') return 'Dream'
  if (lane === 'journal') return 'Journal'
  if (lane === 'memory') return 'Memory'
  if (lane === 'task') return 'Task'
  if (lane === 'note') return 'Note'
  return 'Mobile'
}

/** Builds the privacy-safe queue item used for mobile capture review surfaces. */
export function buildMobileReviewItem(entry: VaultEntry): MobileReviewItem {
  return {
    capturedAt: mobileCapturedTimestamp(entry),
    lane: reviewLane(entry),
    path: entry.path,
    reviewState: mobileReviewState(entry) ?? 'pending',
  }
}

/** True when frontmatter marks a note as an iPhone/iPad capture draft. */
export function isMobileCaptureEntry(entry: VaultEntry): boolean {
  return normalizedPropertyValues(entry.properties?.created_from).includes('mobile-capture')
}

/** Reads the mobile capture time without exposing source device or capture body details. */
export function mobileCapturedTimestamp(entry: VaultEntry): number | null {
  return propertyTimestamp(entry.properties?.captured_at)
}

/** Returns the safe review queue state for an unreviewed mobile capture. */
export function mobileReviewState(entry: VaultEntry): MobileReviewState | null {
  if (!isMobileCaptureEntry(entry)) return null
  const reviewValues = [
    ...normalizedPropertyValues(entry.properties?.mobile_review),
    ...normalizedPropertyValues(entry.properties?.mobile_review_outcome),
  ]
  if (reviewValues.some((value) => CLOSED_REVIEW_VALUES.has(value))) return null
  if (reviewValues.some((value) => BLOCKED_REVIEW_VALUES.has(value))) return 'blocked'
  return 'pending'
}

/** Sorts review items by capture time first, then path for deterministic queues. */
export function sortMobileReviewItems(a: MobileReviewItem, b: MobileReviewItem): number {
  const aTime = a.capturedAt ?? Number.POSITIVE_INFINITY
  const bTime = b.capturedAt ?? Number.POSITIVE_INFINITY
  return aTime - bTime || a.path.localeCompare(b.path)
}
