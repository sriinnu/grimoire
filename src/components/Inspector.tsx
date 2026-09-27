import { useDeferredValue, useMemo } from 'react'
import type { VaultEntry, GitCommit } from '../types'
import type { AiAgentAvailability } from '../lib/aiAgents'
import type { ChitraguptaStatusPayload } from '../lib/chitraguptaIntegration'
import { cn } from '@/lib/utils'
import { parseFrontmatter, detectFrontmatterState } from '../utils/frontmatter'
import { markdownSemanticsAdapter } from '../utils/markdownSemanticsAdapter'
import { mobileReviewState } from '../lib/mobileCaptureMetadata'
import { DynamicPropertiesPanel } from './DynamicPropertiesPanel'
import {
  DynamicRelationshipsPanel,
  BacklinksPanel,
  ReferencedByPanel,
  GitHistoryPanel,
  InstancesPanel,
  LivingFrontmatterPanel,
  LocalityFirewallPanel,
  MemoryPanel,
  MobileCaptureReviewPanel,
  NoteInfoPanel,
  OutlinePanel,
} from './InspectorPanels'
import type { BacklinkItem, ReferencedByItem } from './InspectorPanels'
import { EmptyInspector, InitializePropertiesPrompt, InspectorHeader, InvalidFrontmatterNotice } from './inspector/InspectorChrome'
import { InspectorSection } from './inspector/InspectorSection'
import { extractRelationshipRefs } from './inspector/relationshipPanelModel'
import { useBacklinks, useReferencedBy } from './inspector/useInspectorData'
import { useInspectorPropertyActions } from './inspector/useInspectorPropertyActions'
import { ConstellationInsightsPanel } from './ConstellationInsightsPanel'

export type FrontmatterValue = string | number | boolean | string[] | null

interface InspectorProps {
  collapsed: boolean
  onToggle: () => void
  entry: VaultEntry | null
  content: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  chitraguptaAvailability?: AiAgentAvailability | null
  chitraguptaStatus?: ChitraguptaStatusPayload | null
  vaultPath?: string
  onNavigate: (target: string) => void
  onViewCommitDiff?: (commitHash: string) => void
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onInitializeProperties?: (path: string) => void
  onOpenSecondBrain?: () => void
  onToggleRawEditor?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
  onFileModified?: (relativePath: string) => void
}

type FrontmatterState = ReturnType<typeof detectFrontmatterState>
type Frontmatter = ReturnType<typeof parseFrontmatter>

interface PropertyHandlers {
  onUpdateProperty?: (key: string, value: FrontmatterValue) => void
  onDeleteProperty?: (key: string) => void
  onAddProperty?: (key: string, value: FrontmatterValue) => void
  onCreateMissingType?: (typeName: string) => Promise<boolean | void>
}

function buildTypeEntryMap(entries: VaultEntry[]): Record<string, VaultEntry> {
  const map: Record<string, VaultEntry> = {}
  for (const candidate of entries) {
    if (candidate.isA === 'Type') map[candidate.title] = candidate
  }
  return map
}

/** ① About: what this page is. Properties, or the prompt that gets them started. */
function AboutSection({
  entry,
  entries,
  frontmatter,
  frontmatterState,
  handlers,
  onNavigate,
  onToggleRawEditor,
  onInitializeProperties,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: Frontmatter
  frontmatterState: FrontmatterState
  handlers: PropertyHandlers
  onNavigate: (target: string) => void
  onToggleRawEditor?: () => void
  onInitializeProperties?: (path: string) => void
}) {
  if (frontmatterState === 'invalid') {
    return onToggleRawEditor ? <InvalidFrontmatterNotice onFix={onToggleRawEditor} /> : null
  }
  if (frontmatterState !== 'valid') {
    return onInitializeProperties ? <InitializePropertiesPrompt onClick={() => onInitializeProperties(entry.path)} /> : null
  }
  return (
    <>
      <DynamicPropertiesPanel
        entry={entry}
        frontmatter={frontmatter}
        entries={entries}
        onUpdateProperty={handlers.onUpdateProperty}
        onDeleteProperty={handlers.onDeleteProperty}
        onAddProperty={handlers.onAddProperty}
        onNavigate={onNavigate}
        onCreateMissingType={handlers.onCreateMissingType}
      />
      <LivingFrontmatterPanel
        entry={entry}
        entries={entries}
        frontmatter={frontmatter}
        onApplySuggestion={handlers.onUpdateProperty}
      />
    </>
  )
}

/** ② Connections: what this page touches and what touches it. */
function ConnectionsSection({
  entry,
  entries,
  frontmatter,
  frontmatterState,
  typeEntryMap,
  vaultPath,
  referencedBy,
  backlinks,
  outgoingCount,
  handlers,
  onNavigate,
  onCreateAndOpenNote,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: Frontmatter
  frontmatterState: FrontmatterState
  typeEntryMap: Record<string, VaultEntry>
  vaultPath?: string
  referencedBy: ReferencedByItem[]
  backlinks: BacklinkItem[]
  outgoingCount: number
  handlers: PropertyHandlers
  onNavigate: (target: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  const hasValidFrontmatter = frontmatterState === 'valid'
  const isEmpty = outgoingCount === 0 && referencedBy.length === 0 && backlinks.length === 0 && entry.isA !== 'Type'
  return (
    <>
      {hasValidFrontmatter ? (
        <>
          <DynamicRelationshipsPanel
            frontmatter={frontmatter}
            entries={entries}
            typeEntryMap={typeEntryMap}
            vaultPath={vaultPath}
            onNavigate={onNavigate}
            onAddProperty={handlers.onAddProperty}
            onUpdateProperty={handlers.onUpdateProperty}
            onDeleteProperty={handlers.onDeleteProperty}
            onCreateAndOpenNote={onCreateAndOpenNote}
          />
          <InstancesPanel entry={entry} entries={entries} typeEntryMap={typeEntryMap} onNavigate={onNavigate} />
          <ReferencedByPanel items={referencedBy} typeEntryMap={typeEntryMap} onNavigate={onNavigate} />
        </>
      ) : null}
      <BacklinksPanel backlinks={backlinks} onNavigate={onNavigate} />
      {isEmpty ? (
        <p className="inspector-section__empty" data-testid="inspector-connections-empty">
          No connections yet · type [[ to link a page
        </p>
      ) : null}
    </>
  )
}

function InspectorBody({
  entry,
  entries,
  content,
  gitHistory,
  chitraguptaAvailability,
  chitraguptaStatus,
  vaultPath,
  onNavigate,
  onViewCommitDiff,
  onUpdateFrontmatter,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
  onCreateAndOpenNote,
  onInitializeProperties,
  onOpenSecondBrain,
  onToggleRawEditor,
  onReplaceContent,
  onFileModified,
}: Omit<InspectorProps, 'collapsed' | 'onToggle'>) {
  const deferredContent = useDeferredValue(content ?? '')
  const referencedBy = useReferencedBy(entry, entries)
  const backlinks = useBacklinks(entry, entries, referencedBy)
  const frontmatter = useMemo(() => parseFrontmatter(deferredContent), [deferredContent])
  const frontmatterState = useMemo(() => detectFrontmatterState(deferredContent), [deferredContent])
  const semantics = useMemo(() => markdownSemanticsAdapter.parseDocument(deferredContent), [deferredContent])
  const typeEntryMap = useMemo(() => buildTypeEntryMap(entries), [entries])
  const outgoingCount = useMemo(
    () => (frontmatterState === 'valid' ? extractRelationshipRefs(frontmatter).reduce((sum, group) => sum + group.refs.length, 0) : 0),
    [frontmatter, frontmatterState],
  )
  const hasMobileReview = entry ? mobileReviewState(entry) !== null : false
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

  const handlers: PropertyHandlers = {
    onUpdateProperty: onUpdateFrontmatter ? handleUpdateProperty : undefined,
    onDeleteProperty: onDeleteProperty ? handleDeleteProperty : undefined,
    onAddProperty: onAddProperty ? handleAddProperty : undefined,
    onCreateMissingType: onCreateMissingType ? handleCreateMissingType : undefined,
  }
  const connectionCount = outgoingCount + referencedBy.length + backlinks.length

  return (
    <>
      {hasMobileReview && (
        <MobileCaptureReviewPanel
          entry={entry}
          onUpdateReviewProperty={onUpdateFrontmatter ? handleUpdateProperty : undefined}
        />
      )}
      <InspectorSection id="about" title="About">
        <AboutSection
          entry={entry}
          entries={entries}
          frontmatter={frontmatter}
          frontmatterState={frontmatterState}
          handlers={handlers}
          onNavigate={onNavigate}
          onToggleRawEditor={onToggleRawEditor}
          onInitializeProperties={onInitializeProperties}
        />
      </InspectorSection>
      <InspectorSection id="connections" title="Connections" count={connectionCount}>
        <ConnectionsSection
          entry={entry}
          entries={entries}
          frontmatter={frontmatter}
          frontmatterState={frontmatterState}
          typeEntryMap={typeEntryMap}
          vaultPath={vaultPath}
          referencedBy={referencedBy}
          backlinks={backlinks}
          outgoingCount={outgoingCount}
          handlers={handlers}
          onNavigate={onNavigate}
          onCreateAndOpenNote={onCreateAndOpenNote}
        />
      </InspectorSection>
      <InspectorSection id="history" title="History" count={gitHistory.length}>
        <GitHistoryPanel commits={gitHistory} onViewCommitDiff={onViewCommitDiff} />
        <MemoryPanel
          entry={entry}
          entries={entries}
          semantics={semantics}
          chitraguptaAvailability={chitraguptaAvailability}
          chitraguptaStatus={chitraguptaStatus}
          onNavigate={onNavigate}
          onUpdateRecordProperty={onUpdateFrontmatter}
          onDeleteRecordProperty={onDeleteProperty}
        />
      </InspectorSection>
      <InspectorSection id="details" title="Details">
        <NoteInfoPanel entry={entry} content={content} />
        <LocalityFirewallPanel entry={entry} />
        <ConstellationInsightsPanel
          entry={entry}
          entries={entries}
          content={content}
          vaultPath={vaultPath}
          onOpenSecondBrain={onOpenSecondBrain}
          onNavigate={onNavigate}
          onFileModified={onFileModified}
        />
        <OutlinePanel
          semantics={semantics}
          path={entry.path}
          content={content ?? ''}
          onToggleRawEditor={onToggleRawEditor}
          onReplaceContent={onReplaceContent}
        />
      </InspectorSection>
    </>
  )
}

export function Inspector({ collapsed, onToggle, ...bodyProps }: InspectorProps) {
  return (
    <aside
      className={cn('inspector-panel grimoire-inspector-stage flex flex-1 flex-col overflow-hidden border-l border-border bg-background text-foreground transition-[width] duration-200', collapsed && '!w-10 !min-w-10')}
      data-panel-role="inspector"
    >
      <InspectorHeader collapsed={collapsed} onToggle={onToggle} subtitle={bodyProps.entry?.title ?? null} />
      {!collapsed && (
        <div className="inspector-body grimoire-panel-reveal flex flex-1 flex-col gap-3 overflow-y-auto p-3">
          <InspectorBody {...bodyProps} />
        </div>
      )}
    </aside>
  )
}
