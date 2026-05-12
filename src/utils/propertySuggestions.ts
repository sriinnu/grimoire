import type { PropertyDisplayMode } from './propertyTypes'

/** Defines a quick-add property exposed by the inspector. */
export interface SuggestedPropertyDefinition {
  key: string
  label: string
  displayMode: PropertyDisplayMode
}

const KEY_MODE_HINTS: Array<{ mode: PropertyDisplayMode; patterns: string[] }> = [
  { mode: 'status', patterns: ['status', 'phase', 'state', 'priority', 'progress', 'result'] },
  { mode: 'date', patterns: ['date', 'deadline', 'due', 'start', 'end', 'scheduled'] },
  { mode: 'url', patterns: ['url', 'link', 'website', 'source'] },
  { mode: 'tags', patterns: ['tags', 'keywords', 'categories', 'labels'] },
  { mode: 'color', patterns: ['color', 'background', 'foreground', 'accent', 'fill'] },
  { mode: 'boolean', patterns: ['flag', 'published', 'draft', 'done', 'enabled', 'pinned'] },
  { mode: 'number', patterns: ['count', 'estimate', 'score', 'rating', 'amount', 'hours', 'days', 'minutes'] },
]

export const SUGGESTED_PROPERTIES: readonly SuggestedPropertyDefinition[] = [
  { key: 'Status', label: 'Status', displayMode: 'status' },
  { key: 'Priority', label: 'Priority', displayMode: 'status' },
  { key: 'Tags', label: 'Tags', displayMode: 'tags' },
  { key: 'Date', label: 'Date', displayMode: 'date' },
  { key: 'Owner', label: 'Owner', displayMode: 'text' },
  { key: 'URL', label: 'URL', displayMode: 'url' },
  { key: 'Flag', label: 'Flag', displayMode: 'boolean' },
  { key: 'icon', label: 'Icon', displayMode: 'text' },
]

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function keyMatches(normalizedKey: string, pattern: string): boolean {
  return normalizedKey === pattern || normalizedKey.includes(pattern)
}

/** Infers the most useful editor type from a property name before a value exists. */
export function inferDisplayModeFromPropertyKey(key: string): PropertyDisplayMode {
  const normalizedKey = normalizeKey(key)
  if (!normalizedKey) return 'text'

  for (const hint of KEY_MODE_HINTS) {
    if (hint.patterns.some((pattern) => keyMatches(normalizedKey, pattern))) {
      return hint.mode
    }
  }

  return 'text'
}

/** Returns the initial string value used by the add-property form for a mode. */
export function initialPropertyValueForMode(mode: PropertyDisplayMode): string {
  return mode === 'boolean' ? 'false' : ''
}
