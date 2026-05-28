import type { VaultEntry } from '../../types'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import type { FrontmatterValue } from '../Inspector'
import { PROPERTY_PANEL_GRID_STYLE } from '../propertyPanelLayout'
import { AddRelationshipForm } from './RelationshipSearchControls'
import {
  DisabledRelationshipButton,
  RelationshipActionRow,
  RelationshipGroup,
  SuggestedRelationshipSlot,
} from './RelationshipRows'
import { useRelationshipPanelState } from './relationshipPanelModel'

const RELATIONSHIPS_PANEL_GRID_CLASS_NAME = 'grid min-w-0 gap-x-2 gap-y-3'

/** Renders editable wikilink relationships from frontmatter in the Inspector. */
export function DynamicRelationshipsPanel({
  frontmatter,
  entries,
  typeEntryMap,
  vaultPath,
  onNavigate,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onCreateAndOpenNote,
}: {
  frontmatter: ParsedFrontmatter
  entries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  vaultPath?: string
  onNavigate: (target: string) => void
  onAddProperty?: (key: string, value: FrontmatterValue) => void
  onUpdateProperty?: (key: string, value: FrontmatterValue) => void
  onDeleteProperty?: (key: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  const {
    relationshipEntries,
    resolvedVaultPath,
    handleRemoveRef,
    handleAddRef,
    canEdit,
    missingSuggestedRels,
  } = useRelationshipPanelState({
    frontmatter,
    entries,
    vaultPath,
    onAddProperty,
    onUpdateProperty,
    onDeleteProperty,
  })

  return (
    <div
      className={RELATIONSHIPS_PANEL_GRID_CLASS_NAME}
      style={PROPERTY_PANEL_GRID_STYLE}
      data-testid="relationships-panel-grid"
    >
      {relationshipEntries.map(({ key, refs }) => (
        <RelationshipGroup
          key={key}
          label={key}
          refs={refs}
          entries={entries}
          typeEntryMap={typeEntryMap}
          vaultPath={resolvedVaultPath}
          onNavigate={onNavigate}
          onRemoveRef={canEdit ? (ref) => handleRemoveRef(key, ref) : undefined}
          onAddRef={canEdit ? (ref) => handleAddRef(key, ref) : undefined}
          onCreateAndOpenNote={canEdit ? onCreateAndOpenNote : undefined}
        />
      ))}
      {missingSuggestedRels.map((label) => (
        <SuggestedRelationshipSlot
          key={label}
          label={label}
          entries={entries}
          vaultPath={resolvedVaultPath}
          onAdd={(ref) => onAddProperty?.(label, ref)}
          onCreateAndOpenNote={onCreateAndOpenNote}
        />
      ))}
      <RelationshipActionRow>
        {onAddProperty ? (
          <AddRelationshipForm
            entries={entries}
            vaultPath={resolvedVaultPath}
            onAddProperty={onAddProperty}
            onCreateAndOpenNote={onCreateAndOpenNote}
          />
        ) : (
          <DisabledRelationshipButton />
        )}
      </RelationshipActionRow>
    </div>
  )
}
