import type { TimeLoomBucket } from './timeLoom'
import { formatTypeCount, formatTypeLabel } from '../utils/notebookCountLabels'

export type TimeLoomGraphPrivacy = 'held-local' | 'safe'
export type TimeLoomGraphTone = 'capture' | 'day' | 'external' | 'memory' | 'private' | 'work'

export interface TimeLoomGraphNode {
  count: number
  id: string
  label: string
  privacy: TimeLoomGraphPrivacy
  tone: TimeLoomGraphTone
}

export interface TimeLoomGraphLink {
  count: number
  from: string
  id: string
  label: string
  privacy: TimeLoomGraphPrivacy
  to: string
}

export interface TimeLoomGraph {
  links: TimeLoomGraphLink[]
  nodes: TimeLoomGraphNode[]
  privacyNote: string
}

const MAX_LANE_NODES = 6
const PRIVATE_LANE_ID = 'lane:held-local'

/** Builds a count-only graph from already-sanitized trail buckets. */
export function buildTimeLoomGraph(buckets: TimeLoomBucket[]): TimeLoomGraph {
  const nodes: TimeLoomGraphNode[] = []
  const links: TimeLoomGraphLink[] = []
  const laneTotals = new Map<string, number>()
  let heldLocalTotal = 0

  for (const bucket of buckets) {
    nodes.push(dayNode(bucket))
    heldLocalTotal += bucket.protectedCount
    for (const typeCount of bucket.typeCounts) {
      laneTotals.set(typeCount.label, (laneTotals.get(typeCount.label) ?? 0) + typeCount.count)
    }
  }

  const laneLabels = [...laneTotals.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_LANE_NODES)
    .map(([label]) => label)
  const laneLabelSet = new Set(laneLabels)

  for (const label of laneLabels) {
    nodes.push({
      count: laneTotals.get(label) ?? 0,
      id: laneId(label),
      label: formatTypeLabel(label, laneTotals.get(label) ?? 0),
      privacy: 'safe',
      tone: toneForLane(label),
    })
  }

  if (heldLocalTotal > 0) {
    nodes.push({
      count: heldLocalTotal,
      id: PRIVATE_LANE_ID,
      label: 'Held local',
      privacy: 'held-local',
      tone: 'private',
    })
  }

  for (const bucket of buckets) {
    const dayId = dayNodeId(bucket)
    for (const typeCount of bucket.typeCounts) {
      if (!laneLabelSet.has(typeCount.label)) continue
      links.push({
        count: typeCount.count,
        from: dayId,
        id: `${dayId}->${laneId(typeCount.label)}`,
        label: formatTypeCount(typeCount.label, typeCount.count),
        privacy: 'safe',
        to: laneId(typeCount.label),
      })
    }
    if (bucket.protectedCount > 0) {
      links.push({
        count: bucket.protectedCount,
        from: dayId,
        id: `${dayId}->${PRIVATE_LANE_ID}`,
        label: `${bucket.protectedCount} held`,
        privacy: 'held-local',
        to: PRIVATE_LANE_ID,
      })
    }
  }

  return {
    links,
    nodes,
    privacyNote: 'count-only trail graph; private labels withheld',
  }
}

function dayNode(bucket: TimeLoomBucket): TimeLoomGraphNode {
  return {
    count: bucket.total,
    id: dayNodeId(bucket),
    label: bucket.label,
    privacy: bucket.protectedCount > 0 ? 'held-local' : 'safe',
    tone: 'day',
  }
}

function dayNodeId(bucket: TimeLoomBucket): string {
  return `day:${bucket.dateKey}`
}

function laneId(label: string): string {
  return `lane:${label.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`
}

function toneForLane(label: string): TimeLoomGraphTone {
  if (label === 'Mobile' || label === 'Voice' || label === 'Journal' || label === 'Dream') return 'capture'
  if (label === 'Memory' || label === 'Memory review') return 'memory'
  if (label === 'Calendar' || label === 'Commit') return 'external'
  if (label === 'Task' || label === 'Meeting') return 'work'
  if (label === 'Private') return 'private'
  return 'day'
}
