import { useDeferredValue, useMemo } from 'react'
import type { VaultEntry, GitCommit } from '../types'
import { cn } from '@/lib/utils'
import { Separator } from './ui/separator'
import { parseFrontmatter, detectFrontmatterState } from '../utils/frontmatter'
import { markdownSemanticsAdapter } from '../utils/markdownSemanticsAdapter'
import { DynamicPropertiesPanel } from './DynamicPropertiesPanel'
import {
  DynamicRelationshipsPanel,
  BacklinksPanel,
  ReferencedByPanel,
  GitHistoryPanel,
  InstancesPanel,
  MemoryPanel,
  NoteInfoPanel,
  OutlinePanel,
} from './InspectorPanels'
import type { ReferencedByItem } from './InspectorPanels'
import { EmptyInspector, InitializePropertiesPrompt, InspectorHeader, InvalidFrontmatterNotice } from './inspector/InspectorChrome'
import { useBacklinks, useReferencedBy } from './inspector/useInspectorData'
import { useInspectorPropertyActions } from './inspector/useInspectorPropertyActions'

export type FrontmatterValue = string | number | boolean | string[] | null

interface InspectorProps {
  collapsed: boolean
  onToggle: () => void
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  vaultPath?: string
  onNavigate: (target: string) => void
  onViewCommitDiff?: (commitHash: string) => void
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onInitializeProperties?: (path: string) => void
  onToggleRawEditor?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
}

function buildTypeEntryMap(entries: VaultEntry[]): Record<string, VaultEntry> {
  const map: Record<string, VaultEntry> = {}
  for (const candidate of entries) {
    if (candidate.isA === 'Type') map[candidate.title] = candidate
  }
  return map
}

function ValidFrontmatterPanels({
  entry,
  entries,
  frontmatter,
  typeEntryMap,
  vaultPath,
  referencedBy,
  onNavigate,
  onCreateAndOpenNote,
  onUpdateProperty,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: ReturnType<typeof parseFrontmatter>
  typeEntryMap: Record<string, VaultEntry>
  vaultPath?: string
  referencedBy: ReferencedByItem[]
  onNavigate: (target: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onUpdateProperty?: (key: string, value: FrontmatterValue) => void
  onDeleteProperty?: (key: string) => void
  onAddProperty?: (key: string, value: FrontmatterValue) => void
  onCreateMissingType?: (typeName: string) => Promise<boolean | void>
}) {
  return (
    <>
      <DynamicPropertiesPanel
        entry={entry}
        frontmatter={frontmatter}
        entries={entries}
        onUpdateProperty={onUpdateProperty}
        onDeleteProperty={onDeleteProperty}
        onAddProperty={onAddProperty}
        onNavigate={onNavigate}
        onCreateMissingType={onCreateMissingType}
      />
      <Separator data-testid="inspector-properties-relationships-separator" />
      <DynamicRelationshipsPanel
        frontmatter={frontmatter}
        entries={entries}
        typeEntryMap={typeEntryMap}
        vaultPath={vaultPath}
        onNavigate={onNavigate}
        onAddProperty={onAddProperty}
        onUpdateProperty={onUpdateProperty}
        onDeleteProperty={onDeleteProperty}
        onCreateAndOpenNote={onCreateAndOpenNote}
      />
      <InstancesPanel entry={entry} entries={entries} typeEntryMap={typeEntryMap} onNavigate={onNavigate} />
      <ReferencedByPanel items={referencedBy} typeEntryMap={typeEntryMap} onNavigate={onNavigate} />
    </>
  )
}

function PrimaryInspectorPanel({
  entry,
  frontmatterState,
  frontmatter,
  entries,
  typeEntryMap,
  vaultPath,
  referencedBy,
  onNavigate,
  onToggleRawEditor,
  onInitializeProperties,
  onCreateAndOpenNote,
  onUpdateProperty,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
}: {
  entry: VaultEntry
  frontmatterState: ReturnType<typeof detectFrontmatterState>
  frontmatter: ReturnType<typeof parseFrontmatter>
  entries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  vaultPath?: string
  referencedBy: ReferencedByItem[]
  onNavigate: (target: string) => void
  onToggleRawEditor?: () => void
  onInitializeProperties?: (path: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onUpdateProperty?: (key: string, value: FrontmatterValue) => void
  onDeleteProperty?: (key: string) => void
  onAddProperty?: (key: string, value: FrontmatterValue) => void
  onCreateMissingType?: (typeName: string) => Promise<boolean | void>
}) {
  if (frontmatterState === 'valid') {
    return (
      <ValidFrontmatterPanels
        entry={entry}
        entries={entries}
        frontmatter={frontmatter}
        typeEntryMap={typeEntryMap}
        vaultPath={vaultPath}
        referencedBy={referencedBy}
        onNavigate={onNavigate}
        onCreateAndOpenNote={onCreateAndOpenNote}
        onUpdateProperty={onUpdateProperty}
        onDeleteProperty={onDeleteProperty}
        onAddProperty={onAddProperty}
        onCreateMissingType={onCreateMissingType}
      />
    )
  }

  if (frontmatterState === 'invalid') {
    return onToggleRawEditor ? <InvalidFrontmatterNotice onFix={onToggleRawEditor} /> : null
  }

  return onInitializeProperties ? <InitializePropertiesPrompt onClick={() => onInitializeProperties(entry.path)} /> : null
}

function InspectorBody({
  entry,
  entries,
  content,
  gitHistory,
  vaultPath,
  onNavigate,
  onViewCommitDiff,
  onUpdateFrontmatter,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
  onCreateAndOpenNote,
  onInitializeProperties,
  onToggleRawEditor,
  onReplaceContent,
}: Omit<InspectorProps, 'collapsed' | 'onToggle'>) {
  const deferredContent = useDeferredValue(content ?? '')
  const referencedBy = useReferencedBy(entry, entries)
  const backlinks = useBacklinks(entry, entries, referencedBy)
  const frontmatter = useMemo(() => parseFrontmatter(deferredContent), [deferredContent])
  const frontmatterState = useMemo(() => detectFrontmatterState(deferredContent), [deferredContent])
  const semantics = useMemo(() => markdownSemanticsAdapter.parseDocument(deferredContent), [deferredContent])
  const typeEntryMap = useMemo(() => buildTypeEntryMap(entries), [entries])
  const {
    handleUpdateProperty,
    handleDeleteProperty,
    handleAddProperty,
    handleCreateMissingType,
  } = useInspectorPropertyActions({
    entry,
    onUpdateFrontmatter,
    onDeleteProperty,
    onAddProperty,
    onCreateMissingType,
  })

  if (!entry) {
    return <EmptyInspector />
  }

  return (
    <>
      <OutlinePanel
        semantics={semantics}
        path={entry.path}
        content={content ?? ''}
        onToggleRawEditor={onToggleRawEditor}
        onReplaceContent={onReplaceContent}
      />
      <Separator />
      <MemoryPanel entry={entry} entries={entries} semantics={semantics} />
      <Separator />
      <PrimaryInspectorPanel
        entry={entry}
        frontmatterState={frontmatterState}
        frontmatter={frontmatter}
        entries={entries}
        typeEntryMap={typeEntryMap}
        vaultPath={vaultPath}
        referencedBy={referencedBy}
        onNavigate={onNavigate}
        onToggleRawEditor={onToggleRawEditor}
        onInitializeProperties={onInitializeProperties}
        onCreateAndOpenNote={onCreateAndOpenNote}
        onUpdateProperty={onUpdateFrontmatter ? handleUpdateProperty : undefined}
        onDeleteProperty={onDeleteProperty ? handleDeleteProperty : undefined}
        onAddProperty={onAddProperty ? handleAddProperty : undefined}
        onCreateMissingType={onCreateMissingType ? handleCreateMissingType : undefined}
      />
      {backlinks.length > 0 && <Separator />}
      <BacklinksPanel backlinks={backlinks} onNavigate={onNavigate} />
      <Separator />
      <NoteInfoPanel entry={entry} content={content} />
      {gitHistory.length > 0 && <Separator />}
      <GitHistoryPanel commits={gitHistory} onViewCommitDiff={onViewCommitDiff} />
    </>
  )
}

export function Inspector({ collapsed, onToggle, ...bodyProps }: InspectorProps) {
  return (
    <aside className={cn('inspector-panel flex flex-1 flex-col overflow-hidden border-l border-border bg-background text-foreground transition-[width] duration-200', collapsed && '!w-10 !min-w-10')}>
      <InspectorHeader collapsed={collapsed} onToggle={onToggle} />
      {!collapsed && (
        <div className="inspector-body flex flex-1 flex-col gap-4 overflow-y-auto p-3">
          <InspectorBody {...bodyProps} />
        </div>
      )}
    </aside>
  )
}
