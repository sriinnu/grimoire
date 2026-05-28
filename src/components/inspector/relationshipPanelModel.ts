import { useCallback, useMemo } from 'react'
import type { VaultEntry } from '../../types'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import type { FrontmatterValue } from '../Inspector'
import { containsWikilinks } from '../DynamicPropertiesPanel'
import { isWikilink } from './shared'

export const SUGGESTED_RELATIONSHIPS = ['belongs_to', 'related_to', 'has'] as const

export type RelationshipEntryGroup = {
  key: string
  refs: string[]
}

export type RelationshipPanelEditHandlers = {
  onAddProperty?: (key: string, value: FrontmatterValue) => void
  onUpdateProperty?: (key: string, value: FrontmatterValue) => void
  onDeleteProperty?: (key: string) => void
}

/** Infers a shared vault-relative prefix for relationship link canonicalization. */
export function inferVaultPath(entries: VaultEntry[]): string {
  if (entries.length === 0) return ''
  const segments = entries.map((entry) => entry.path.split('/').slice(0, -1))
  const prefix: string[] = []
  const maxDepth = Math.min(...segments.map((parts) => parts.length))
  for (let index = 0; index < maxDepth; index += 1) {
    const segment = segments[0][index]
    if (segments.every((parts) => parts[index] === segment)) prefix.push(segment)
    else break
  }
  return prefix.join('/')
}

/** Extracts wikilink-valued frontmatter fields as relationship groups. */
export function extractRelationshipRefs(
  frontmatter: ParsedFrontmatter,
): RelationshipEntryGroup[] {
  return Object.entries(frontmatter)
    .filter(([key, value]) => key !== 'Type' && containsWikilinks(value))
    .map(([key, value]) => {
      const refs: string[] = []
      if (typeof value === 'string' && isWikilink(value)) refs.push(value)
      else if (Array.isArray(value)) {
        value.forEach((item) => {
          if (typeof item === 'string' && isWikilink(item)) refs.push(item)
        })
      }
      return { key, refs }
    })
    .filter(({ refs }) => refs.length > 0)
}

/** Removes a relationship reference and returns the next frontmatter value. */
export function updateRefsForRemoval(
  refs: string[],
  refToRemove: string,
): FrontmatterValue | null {
  const remaining = refs.filter((ref) => ref !== refToRemove)
  if (remaining.length === 0) return null
  return remaining.length === 1 ? remaining[0] : remaining
}

/** Adds a relationship reference unless it already exists. */
export function updateRefsForAddition(
  refs: string[],
  refToAdd: string,
): FrontmatterValue | false {
  if (refs.includes(refToAdd)) return false
  const updated = [...refs, refToAdd]
  return updated.length === 1 ? updated[0] : updated
}

function useRelationshipMutations(
  relationshipEntries: RelationshipEntryGroup[],
  handlers: RelationshipPanelEditHandlers,
) {
  const { onUpdateProperty, onDeleteProperty } = handlers

  const handleRemoveRef = useCallback((key: string, refToRemove: string) => {
    if (!onUpdateProperty || !onDeleteProperty) return
    const group = relationshipEntries.find((entry) => entry.key === key)
    if (!group) return
    const result = updateRefsForRemoval(group.refs, refToRemove)
    if (result === null) onDeleteProperty(key)
    else onUpdateProperty(key, result)
  }, [relationshipEntries, onUpdateProperty, onDeleteProperty])

  const handleAddRef = useCallback((key: string, ref: string) => {
    if (!onUpdateProperty) return
    const existing = relationshipEntries.find((entry) => entry.key === key)?.refs ?? []
    const result = updateRefsForAddition(existing, ref)
    if (result !== false) onUpdateProperty(key, result)
  }, [relationshipEntries, onUpdateProperty])

  return {
    handleRemoveRef,
    handleAddRef,
    canEdit: Boolean(onUpdateProperty && onDeleteProperty),
  }
}

function useMissingSuggestedRelationships(
  relationshipEntries: RelationshipEntryGroup[],
  onAddProperty?: RelationshipPanelEditHandlers['onAddProperty'],
) {
  const existingRelKeys = useMemo(
    () => new Set(relationshipEntries.map((group) => group.key.toLowerCase())),
    [relationshipEntries],
  )
  return useMemo(
    () => (
      onAddProperty
        ? SUGGESTED_RELATIONSHIPS.filter(
            (relationship) => !existingRelKeys.has(relationship.toLowerCase()),
          )
        : []
    ),
    [onAddProperty, existingRelKeys],
  )
}

/** Derives display and edit state for the relationships inspector panel. */
export function useRelationshipPanelState({
  frontmatter,
  entries,
  vaultPath,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
}: {
  frontmatter: ParsedFrontmatter
  entries: VaultEntry[]
  vaultPath?: string
} & RelationshipPanelEditHandlers) {
  const relationshipEntries = useMemo(
    () => extractRelationshipRefs(frontmatter),
    [frontmatter],
  )
  const resolvedVaultPath = useMemo(
    () => vaultPath ?? inferVaultPath(entries),
    [vaultPath, entries],
  )
  const { handleRemoveRef, handleAddRef, canEdit } = useRelationshipMutations(
    relationshipEntries,
    { onAddProperty, onUpdateProperty, onDeleteProperty },
  )
  const missingSuggestedRels = useMissingSuggestedRelationships(
    relationshipEntries,
    onAddProperty,
  )

  return {
    relationshipEntries,
    resolvedVaultPath,
    handleRemoveRef,
    handleAddRef,
    canEdit,
    missingSuggestedRels,
  }
}
