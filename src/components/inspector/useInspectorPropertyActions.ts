import { useMemo } from 'react'
import type { VaultEntry } from '../../types'

type FrontmatterValue = string | number | boolean | string[] | null

interface InspectorPropertyActionsConfig {
  entry: VaultEntry | null
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
}

function bindEntryAction<TArgs extends unknown[], TResult>(
  entry: VaultEntry | null,
  action: ((path: string, ...args: TArgs) => TResult) | undefined,
) {
  if (!entry || !action) return undefined
  return (...args: TArgs) => action(entry.path, ...args)
}

function bindMissingTypeAction(
  entry: VaultEntry | null,
  action: ((path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>) | undefined,
) {
  if (!entry || !action) return undefined
  // Untyped notes have no missing type to repair, but can still create a type
  // from scratch (for example via the TypeSelector create-from-query option).
  return (nextTypeName: string) => action(entry.path, entry.isA ?? nextTypeName, nextTypeName)
}

export function useInspectorPropertyActions({
  entry,
  onUpdateFrontmatter,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
}: InspectorPropertyActionsConfig) {
  const handleUpdateProperty = useMemo(
    () => bindEntryAction<[string, FrontmatterValue], Promise<void>>(entry, onUpdateFrontmatter),
    [entry, onUpdateFrontmatter],
  )
  const handleDeleteProperty = useMemo(
    () => bindEntryAction<[string], Promise<void>>(entry, onDeleteProperty),
    [entry, onDeleteProperty],
  )
  const handleAddProperty = useMemo(
    () => bindEntryAction<[string, FrontmatterValue], Promise<void>>(entry, onAddProperty),
    [entry, onAddProperty],
  )
  const handleCreateMissingType = useMemo(
    () => bindMissingTypeAction(entry, onCreateMissingType),
    [entry, onCreateMissingType],
  )

  return {
    handleUpdateProperty,
    handleDeleteProperty,
    handleAddProperty,
    handleCreateMissingType,
  }
}
