import type { VaultEntry } from '../../types'
import { resolveEntry, wikilinkDisplay, wikilinkTarget } from '../../utils/wikilink'

export interface NoteProjectContext {
  key: string
  label: string
  target: string
  entry?: VaultEntry
}

interface RelationshipRef {
  ref: string
  source: 'belongsTo' | 'projectProperty'
}

const PROJECT_RELATIONSHIP_KEYS = new Set(['belongs to', 'belongsto', 'project', 'projects'])
const EXPLICIT_PROJECT_KEYS = new Set(['project', 'projects'])
const PROJECT_PATH_PATTERN = /(^|\/)project(s)?\//iu
const MAX_PROJECT_CONTEXTS = 2

export function isProjectContextPropertyName(propName: string): boolean {
  return PROJECT_RELATIONSHIP_KEYS.has(propName.trim().toLowerCase())
}

function relationshipRefs(entry: VaultEntry): RelationshipRef[] {
  const refs: RelationshipRef[] = entry.belongsTo.map((ref) => ({ ref, source: 'belongsTo' }))
  for (const [key, values] of Object.entries(entry.relationships)) {
    const normalizedKey = key.trim().toLowerCase()
    if (!isProjectContextPropertyName(normalizedKey)) continue
    const source: RelationshipRef['source'] = EXPLICIT_PROJECT_KEYS.has(normalizedKey) ? 'projectProperty' : 'belongsTo'
    refs.push(...values.map((ref) => ({ ref, source })))
  }
  return refs
}

function looksLikeProject({ ref, source }: RelationshipRef, resolvedEntry?: VaultEntry): boolean {
  const target = wikilinkTarget(ref)
  if (resolvedEntry?.isA?.toLowerCase() === 'project') return true
  if (source === 'projectProperty') return true
  if (PROJECT_PATH_PATTERN.test(target)) return true
  return !resolvedEntry && source === 'belongsTo' && !target.includes('/')
}

function contextKey(ref: string, resolvedEntry?: VaultEntry): string {
  return resolvedEntry?.path ?? wikilinkTarget(ref).toLowerCase()
}

function contextLabel(ref: string, resolvedEntry?: VaultEntry): string {
  if (ref.includes('|')) return wikilinkDisplay(ref)
  return resolvedEntry?.title ?? wikilinkDisplay(ref)
}

/**
 * Returns project context for a note row so folder lists/search results show
 * where work belongs without requiring list-property customization.
 */
export function getNoteProjectContexts(entry: VaultEntry, allEntries: VaultEntry[]): NoteProjectContext[] {
  const seen = new Set<string>()
  const contexts: NoteProjectContext[] = []

  for (const relationshipRef of relationshipRefs(entry)) {
    const { ref } = relationshipRef
    const resolvedEntry = resolveEntry(allEntries, wikilinkTarget(ref))
    if (!looksLikeProject(relationshipRef, resolvedEntry)) continue

    const key = contextKey(ref, resolvedEntry)
    if (seen.has(key)) continue
    seen.add(key)
    contexts.push({ key, label: contextLabel(ref, resolvedEntry), target: wikilinkTarget(ref), entry: resolvedEntry })
    if (contexts.length >= MAX_PROJECT_CONTEXTS) break
  }

  return contexts
}
