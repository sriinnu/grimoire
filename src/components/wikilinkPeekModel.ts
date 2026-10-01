import type { CSSProperties } from 'react'
import type { VaultEntry } from '../types'
import { resolveEntry, wikilinkDisplay } from '../utils/wikilink'
import { relativeDate } from '../utils/noteListHelpers'

export type WikilinkPeekModel =
  | { kind: 'note'; title: string; meta: string; excerpt: string }
  | { kind: 'missing'; title: string }

// Roughly three lines of card text; CSS clamps the rest.
const EXCERPT_MAX_CHARS = 220

export function peekExcerpt(snippet: string | null | undefined): string {
  const flat = (snippet ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= EXCERPT_MAX_CHARS) return flat
  const cut = flat.slice(0, EXCERPT_MAX_CHARS)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > EXCERPT_MAX_CHARS * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

function peekMeta(entry: VaultEntry): string {
  const parts: string[] = []
  if (entry.isA) parts.push(entry.isA)
  const edited = relativeDate(entry.modifiedAt)
  if (edited) parts.push(`Edited ${edited}`)
  return parts.join(' · ')
}

export function buildWikilinkPeekModel(entries: VaultEntry[], target: string): WikilinkPeekModel | null {
  const trimmed = target.trim()
  if (!trimmed) return null
  const entry = resolveEntry(entries, trimmed)
  if (!entry) return { kind: 'missing', title: wikilinkDisplay(trimmed) }
  return {
    kind: 'note',
    title: entry.title,
    meta: peekMeta(entry),
    excerpt: peekExcerpt(entry.snippet),
  }
}

export interface WikilinkPeekAnchor {
  top: number
  bottom: number
  left: number
}

const CARD_WIDTH = 300
const CARD_EST_HEIGHT = 150
const GAP = 6
const EDGE = 8

export function peekCardPosition(anchor: WikilinkPeekAnchor, viewport = { width: window.innerWidth, height: window.innerHeight }): CSSProperties {
  const maxLeft = Math.max(EDGE, viewport.width - CARD_WIDTH - EDGE)
  const left = Math.min(Math.max(anchor.left, EDGE), maxLeft)
  const fitsBelow = anchor.bottom + GAP + CARD_EST_HEIGHT <= viewport.height - EDGE
  if (fitsBelow || anchor.top < CARD_EST_HEIGHT + GAP) return { left, top: anchor.bottom + GAP }
  return { left, bottom: viewport.height - anchor.top + GAP }
}
