import type { MarkdownHeading } from '@grimoire/markdown-editor'

export const MIN_OUTLINE_HEADINGS = 3
export const MIN_OUTLINE_CANVAS_WIDTH = 1100
export const MAX_OUTLINE_LEVEL = 3

export interface OutlineRailItem {
  key: string
  heading: MarkdownHeading
  /** Position in the full heading list, which the shared jump logic expects. */
  index: number
  indent: number
}

/** H1–H3 slice of the shared note headings, indented relative to the shallowest level present. */
export function buildOutlineRailItems(headings: MarkdownHeading[]): OutlineRailItem[] {
  const items: OutlineRailItem[] = []
  let minLevel = MAX_OUTLINE_LEVEL
  headings.forEach((heading, index) => {
    if (heading.level > MAX_OUTLINE_LEVEL) return
    minLevel = Math.min(minLevel, heading.level)
    items.push({ key: `${heading.slug}:${heading.line}`, heading, index, indent: 0 })
  })
  for (const item of items) item.indent = item.heading.level - minLevel
  return items
}

export function shouldShowOutlineRail(options: {
  enabled: boolean
  wide: boolean
  itemCount: number
}): boolean {
  return options.enabled && options.wide && options.itemCount >= MIN_OUTLINE_HEADINGS
}

/** Index of the last heading whose top has crossed the reading line. */
export function pickActiveOutlineIndex(tops: Array<number | null>, readingLine: number, atBottom: boolean): number {
  let active = -1
  let lastKnown = -1
  tops.forEach((top, index) => {
    if (top === null) return
    lastKnown = index
    if (top <= readingLine) active = index
  })
  if (atBottom && lastKnown >= 0) return lastKnown
  if (active === -1) {
    const firstKnown = tops.findIndex((top) => top !== null)
    return firstKnown
  }
  return active
}
