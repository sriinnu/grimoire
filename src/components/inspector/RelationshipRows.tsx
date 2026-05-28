import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { VaultEntry } from '../../types'
import { humanizePropertyKey } from '../../utils/propertyLabels'
import { PROPERTY_PANEL_LABEL_CLASS_NAME } from '../propertyPanelLayout'
import { LinkButton } from './LinkButton'
import { resolveRefProps } from './shared'
import { InlineAddNote } from './RelationshipSearchControls'

const RELATIONSHIP_SECTION_ROW_CLASS_NAME = 'flex min-w-0 flex-col gap-1 px-1.5'
const RELATIONSHIP_SECTION_LABEL_TEXT_CLASS_NAME = 'min-w-0 flex-1 truncate'
const RELATIONSHIP_SECTION_VALUE_CLASS_NAME = 'min-w-0'
const RELATIONSHIP_ACTION_ROW_CLASS_NAME = 'min-w-0 px-1.5'

/** Full-width relationship row with a property-label header. */
export function RelationshipSectionRow({
  label,
  children,
  dataTestId,
}: {
  label: string
  children: ReactNode
  dataTestId?: string
}) {
  return (
    <div
      className={RELATIONSHIP_SECTION_ROW_CLASS_NAME}
      style={{ gridColumn: '1 / -1' }}
      data-testid={dataTestId}
    >
      <span className={PROPERTY_PANEL_LABEL_CLASS_NAME} data-testid="relationship-section-label">
        <span className={RELATIONSHIP_SECTION_LABEL_TEXT_CLASS_NAME}>
          {humanizePropertyKey(label)}
        </span>
      </span>
      <div className={RELATIONSHIP_SECTION_VALUE_CLASS_NAME}>{children}</div>
    </div>
  )
}

/** Full-width action row for panel-level relationship actions. */
export function RelationshipActionRow({ children }: { children: ReactNode }) {
  return (
    <div className={RELATIONSHIP_ACTION_ROW_CLASS_NAME} style={{ gridColumn: '1 / -1' }}>
      <div className={RELATIONSHIP_SECTION_VALUE_CLASS_NAME}>{children}</div>
    </div>
  )
}

/** Existing relationship group with removable links and inline add-reference control. */
export function RelationshipGroup({
  label,
  refs,
  entries,
  typeEntryMap,
  vaultPath,
  onNavigate,
  onRemoveRef,
  onAddRef,
  onCreateAndOpenNote,
}: {
  label: string
  refs: string[]
  entries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  vaultPath: string
  onNavigate: (target: string) => void
  onRemoveRef?: (ref: string) => void
  onAddRef?: (ref: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  if (refs.length === 0) return null

  return (
    <RelationshipSectionRow label={label}>
      <div className="flex flex-col gap-1">
        {refs.map((ref, index) => {
          const props = resolveRefProps(ref, entries, typeEntryMap)
          return (
            <LinkButton
              key={`${ref}-${index}`}
              {...props}
              onClick={() => onNavigate(props.target)}
              onRemove={onRemoveRef ? () => onRemoveRef(ref) : undefined}
            />
          )
        })}
      </div>
      {onAddRef && (
        <InlineAddNote
          entries={entries}
          vaultPath={vaultPath}
          onAdd={onAddRef}
          onCreateAndOpenNote={onCreateAndOpenNote}
        />
      )}
    </RelationshipSectionRow>
  )
}

/** Disabled add button shown when relationship editing callbacks are unavailable. */
export function DisabledRelationshipButton() {
  return (
    <Button
      className="mt-2 h-auto w-full px-3 py-1.5 text-xs text-muted-foreground"
      variant="outline"
      size="xs"
      disabled
    >
      + Add relationship
    </Button>
  )
}

/** Empty suggested relationship slot with an inline picker. */
export function SuggestedRelationshipSlot({
  label,
  entries,
  vaultPath,
  onAdd,
  onCreateAndOpenNote,
}: {
  label: string
  entries: VaultEntry[]
  vaultPath: string
  onAdd: (ref: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  return (
    <RelationshipSectionRow label={label} dataTestId="suggested-relationship">
      <InlineAddNote
        entries={entries}
        vaultPath={vaultPath}
        onAdd={onAdd}
        onCreateAndOpenNote={onCreateAndOpenNote}
      />
    </RelationshipSectionRow>
  )
}
