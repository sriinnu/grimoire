import type { VaultEntry } from '../types'
import {
  orderInverseRelationshipLabels as sortInverseRelationshipLabels,
  resolveInverseRelationshipLabel,
} from './inverseRelationshipLabels'
import type { RelationshipGroup } from './noteListHelpers'
import { sortByModified } from './noteListSorting'
import { resolveEntry, wikilinkTarget } from './wikilink'

function refMatchesEntry(ref: string, entry: VaultEntry): boolean {
  const target = wikilinkTarget(ref).trim()
  if (!target) return false

  if (target.includes('/')) {
    const normalizedTarget = target.replace(/^\/+/, '').replace(/\.md$/, '').toLowerCase()
    return entry.path.toLowerCase().endsWith(`/${normalizedTarget}.md`)
  }

  return resolveEntry([entry], target) !== undefined
}

function refsMatch(refs: string[], entry: VaultEntry): boolean {
  return refs.some((ref) => refMatchesEntry(ref, entry))
}

function resolveRefs(refs: string[], entries: VaultEntry[]): VaultEntry[] {
  return refs
    .map((ref) => resolveEntry(entries, wikilinkTarget(ref)))
    .filter((entry): entry is VaultEntry => entry !== undefined)
}

function findBacklinks(entity: VaultEntry, allEntries: VaultEntry[]): VaultEntry[] {
  const stem = entity.filename.replace(/\.md$/, '')
  const pathStem = entity.path.replace(/^.*\/Grimoire\//, '').replace(/\.md$/, '')
  const targets = new Set([entity.title, ...entity.aliases, stem, pathStem])

  return allEntries.filter((entry) => {
    if (entry.path === entity.path) return false
    return entry.outgoingLinks.some((link) =>
      targets.has(link) || targets.has(link.split('/').pop() ?? ''),
    )
  })
}

class GroupBuilder {
  readonly groups: RelationshipGroup[] = []
  private readonly entityPath: string
  private readonly allEntries: VaultEntry[]

  constructor(entityPath: string, allEntries: VaultEntry[]) {
    this.entityPath = entityPath
    this.allEntries = allEntries
  }

  add(label: string, entries: VaultEntry[]) {
    const deduped = new Map<string, VaultEntry>()
    for (const entry of entries) {
      if (entry.path === this.entityPath || deduped.has(entry.path)) continue
      deduped.set(entry.path, entry)
    }

    if (deduped.size === 0) return
    this.groups.push({ label, entries: [...deduped.values()] })
  }

  addFromRefs(label: string, refs: string[]) {
    this.add(label, resolveRefs(refs, this.allEntries).sort(sortByModified))
  }

  filterAndAdd(label: string, predicate: (entry: VaultEntry) => boolean) {
    this.add(label, this.allEntries.filter(predicate).sort(sortByModified))
  }
}

function appendInverseRelationshipEntries(
  inverseGroups: Map<string, VaultEntry[]>,
  label: string,
  entry: VaultEntry,
) {
  const existing = inverseGroups.get(label)
  if (existing) {
    existing.push(entry)
    return
  }

  inverseGroups.set(label, [entry])
}

function appendLegacyInverseRelationshipEntries(
  inverseGroups: Map<string, VaultEntry[]>,
  entity: VaultEntry,
  entry: VaultEntry,
) {
  if (refsMatch(entry.belongsTo, entity)) {
    appendInverseRelationshipEntries(inverseGroups, resolveInverseRelationshipLabel('Belongs to', entry), entry)
  }

  if (refsMatch(entry.relatedTo, entity)) {
    appendInverseRelationshipEntries(inverseGroups, resolveInverseRelationshipLabel('Related to', entry), entry)
  }
}

function appendDynamicInverseRelationshipEntries(
  inverseGroups: Map<string, VaultEntry[]>,
  entity: VaultEntry,
  entry: VaultEntry,
) {
  for (const [key, refs] of Object.entries(entry.relationships ?? {})) {
    if (key === 'Type' || !refsMatch(refs, entity)) continue
    appendInverseRelationshipEntries(inverseGroups, resolveInverseRelationshipLabel(key, entry), entry)
  }
}

function orderInverseRelationshipLabels(inverseGroups: Map<string, VaultEntry[]>): string[] {
  return sortInverseRelationshipLabels(inverseGroups.keys())
}

function collectInverseRelationshipGroups(
  entity: VaultEntry,
  allEntries: VaultEntry[],
): RelationshipGroup[] {
  const inverseGroups = new Map<string, VaultEntry[]>()

  for (const other of allEntries) {
    if (other.path === entity.path) continue
    appendLegacyInverseRelationshipEntries(inverseGroups, entity, other)
    appendDynamicInverseRelationshipEntries(inverseGroups, entity, other)
  }

  return orderInverseRelationshipLabels(inverseGroups)
    .map((label) => {
      const entries = inverseGroups.get(label)
      if (!entries) return null
      return { label, entries: [...entries].sort(sortByModified) }
    })
    .filter((group): group is RelationshipGroup => group !== null)
}

/** Builds relationship groups for the entity note-list view. */
export function buildRelationshipGroups(
  entity: VaultEntry,
  allEntries: VaultEntry[],
): RelationshipGroup[] {
  const builder = new GroupBuilder(entity.path, allEntries)
  const relationships = entity.relationships ?? {}

  if (entity.isA === 'Type') {
    builder.filterAndAdd('Instances', (entry) => entry.isA === entity.title)
  }

  Object.keys(relationships)
    .filter((key) => key.toLowerCase() !== 'type')
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => builder.addFromRefs(key, relationships[key] ?? []))

  collectInverseRelationshipGroups(entity, allEntries).forEach((group) => builder.add(group.label, group.entries))
  builder.add('Backlinks', findBacklinks(entity, allEntries).sort(sortByModified))

  return builder.groups
}
