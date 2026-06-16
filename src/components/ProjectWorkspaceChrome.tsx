import {
  ClipboardList,
  Code2,
  Eye,
  FilePlus2,
  ListTodo,
  Network,
  Search,
} from 'lucide-react'
import { Fragment, type ComponentType, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VaultEntry } from '../types'
import type { GrimoireProjectDocument } from '../project-intelligence/grimoireAdapter'

interface ProjectWorkspaceChromeProps {
  boardAvailable: boolean
  canCreateDoc: boolean
  copiedBoard: boolean
  createdDoc: string | null
  documents: GrimoireProjectDocument[]
  filterNode?: ReactNode
  graphOpen: boolean
  includeSource: boolean
  loading: boolean
  markdownCount: number
  onCopyBoard: () => void
  onCreateDoc: () => void
  onPreviewBoard: () => void
  onQueryChange: (value: string) => void
  onRevealProjectDocs: () => void
  onSaveBoard: () => void
  onScan: () => void
  onSelectNote: (entry: VaultEntry) => void
  onToggleGraph: () => void
  onToggleSource: () => void
  onToggleTasks: () => void
  otherCount: number
  query: string
  savedBoard: boolean
  scanEnabled: boolean
  skippedCount: number
  scopeLabel: string
  taskCount: number
  tasksOpen: boolean
  urgentCount: number
}

const MAX_VISIBLE_DOCUMENTS = 3

function projectScopeParts(scopeLabel: string): string[] {
  return scopeLabel.split('/').map((part) => part.trim()).filter(Boolean)
}

/** Compact, grouped chrome for the project-scoped note list. */
export function ProjectWorkspaceChrome({
  boardAvailable,
  canCreateDoc,
  copiedBoard,
  createdDoc,
  documents,
  filterNode,
  graphOpen,
  includeSource,
  loading,
  markdownCount,
  onCopyBoard,
  onCreateDoc,
  onPreviewBoard,
  onQueryChange,
  onRevealProjectDocs,
  onSaveBoard,
  onScan,
  onSelectNote,
  onToggleGraph,
  onToggleSource,
  onToggleTasks,
  otherCount,
  query,
  savedBoard,
  scanEnabled,
  skippedCount,
  scopeLabel,
  taskCount,
  tasksOpen,
  urgentCount,
}: ProjectWorkspaceChromeProps) {
  return (
    <div className="project-workspace-chrome" data-testid="project-workspace-chrome">
      <div className="project-workspace-chrome__overview" aria-label="Project workspace controls">
        <div className="project-workspace-chrome__scope">
          <span className="project-workspace-chrome__scope-label">Project</span>
          <ProjectScopeTrail scopeLabel={scopeLabel} />
          <ProjectMetricRail
            loading={loading}
            markdownCount={markdownCount}
            otherCount={otherCount}
            skippedCount={skippedCount}
            taskCount={taskCount}
            urgentCount={urgentCount}
          />
        </div>
        <ProjectActionRail
          boardAvailable={boardAvailable}
          copiedBoard={copiedBoard}
          graphOpen={graphOpen}
          onCopyBoard={onCopyBoard}
          onPreviewBoard={onPreviewBoard}
          onSaveBoard={onSaveBoard}
          onScan={onScan}
          onToggleGraph={onToggleGraph}
          onToggleTasks={onToggleTasks}
          savedBoard={savedBoard}
          scanEnabled={scanEnabled}
          taskCount={taskCount}
          tasksOpen={tasksOpen}
        />

        <div className="project-workspace-chrome__search">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search docs or name a new project doc..."
              className="project-workspace-chrome__search-input"
              aria-label="Search project docs"
            />
          </div>
          <div className="project-workspace-chrome__search-actions" aria-label="Project search actions">
            <Button
              type="button"
              variant={includeSource ? 'secondary' : 'ghost'}
              size="icon-sm"
              className="project-workspace-chrome__icon-button size-8 shrink-0"
              title={includeSource ? 'Project results include source files' : 'Include source files in project results'}
              aria-label={includeSource ? 'Project results include source files' : 'Include source files in project results'}
              aria-pressed={includeSource}
              onClick={onToggleSource}
            >
              <Code2 className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="project-workspace-chrome__icon-button size-8 shrink-0"
              title={createdDoc ?? (canCreateDoc ? 'Create project doc' : 'Type a project doc name first')}
              aria-label="Create project doc"
              disabled={!canCreateDoc}
              onClick={onCreateDoc}
            >
              <FilePlus2 className="size-3.5" />
            </Button>
          </div>
        </div>
        {filterNode ? (
          <div className="project-workspace-chrome__filters" data-testid="project-workspace-filters">
            {filterNode}
          </div>
        ) : null}
        <ProjectDocumentRail documents={documents} onRevealProjectDocs={onRevealProjectDocs} onSelectNote={onSelectNote} />
      </div>
    </div>
  )
}

function ProjectScopeTrail({ scopeLabel }: { scopeLabel: string }) {
  const parts = projectScopeParts(scopeLabel)
  if (parts.length === 0) {
    return (
      <span className="project-workspace-chrome__scope-path" title={scopeLabel} aria-label="Project scope">
        Notebook root
      </span>
    )
  }

  return (
    <span
      className="project-workspace-chrome__scope-path"
      title={scopeLabel}
      aria-label={`Project ${scopeLabel}`}
      data-testid="project-scope-breadcrumb"
    >
      {parts.map((part, index) => {
        const isLeaf = index === parts.length - 1
        return (
          <Fragment key={`${part}-${index}`}>
            <span className="project-workspace-chrome__scope-part" data-leaf={isLeaf ? 'true' : undefined}>
              {part}
            </span>
            {!isLeaf ? <span className="project-workspace-chrome__scope-separator" aria-hidden="true">/</span> : null}
          </Fragment>
        )
      })}
    </span>
  )
}

function ProjectDocumentRail({
  documents,
  onRevealProjectDocs,
  onSelectNote,
}: Pick<ProjectWorkspaceChromeProps, 'documents' | 'onRevealProjectDocs' | 'onSelectNote'>) {
  if (documents.length === 0) return null

  const visibleDocuments = documents.slice(0, MAX_VISIBLE_DOCUMENTS)
  const hiddenCount = documents.length - visibleDocuments.length

  return (
    <div className="project-workspace-chrome__docs" data-testid="project-document-rail">
      <span className="project-workspace-chrome__label">Docs</span>
      <span className="project-workspace-chrome__doc-count" aria-label={`${documents.length} project docs`}>
        {documents.length}
      </span>
      <div className="project-workspace-chrome__docs-scroll">
        {visibleDocuments.map((document) => (
          <Button
            key={document.relativePath}
            type="button"
            variant="outline"
            size="xs"
            className="project-workspace-chrome__doc hover:text-foreground"
            title={document.relativePath}
            onClick={() => onSelectNote(document.entry)}
          >
            <span className="truncate">{documentLabel(document)}</span>
          </Button>
        ))}
        {hiddenCount > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="project-workspace-chrome__doc-more"
            aria-label={`${hiddenCount} more project docs`}
            title="Show more project docs"
            onClick={onRevealProjectDocs}
          >
            +{hiddenCount}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function ProjectMetricRail({
  loading,
  markdownCount,
  otherCount,
  skippedCount,
  taskCount,
  urgentCount,
}: Pick<ProjectWorkspaceChromeProps, 'loading' | 'markdownCount' | 'otherCount' | 'skippedCount' | 'taskCount' | 'urgentCount'>) {
  const metrics = [
    { label: `${markdownCount} docs`, state: 'primary', title: `${markdownCount} Markdown documents` },
    otherCount > 0 ? { label: `${otherCount} source`, state: 'quiet', title: `${otherCount} source or non-Markdown files` } : null,
    taskCount > 0 ? { label: `${taskCount} tasks`, state: 'active' } : null,
    urgentCount > 0 ? { label: `${urgentCount} urgent`, state: 'warning' } : null,
    loading ? { label: 'scanning', state: 'busy' } : null,
    skippedCount > 0 ? { label: `${skippedCount} skipped`, state: 'quiet', title: `${skippedCount} files skipped by project scan policy` } : null,
  ].filter((metric): metric is { label: string; state: string; title?: string } => Boolean(metric))

  return (
    <div className="project-workspace-chrome__metrics" aria-label="Project metrics">
      {metrics.map((metric) => (
        <span
          key={metric.label}
          className="project-workspace-chrome__metric"
          data-state={metric.state}
          title={metric.title ?? metric.label}
          aria-label={metric.title ?? metric.label}
        >
          {metric.label}
        </span>
      ))}
    </div>
  )
}

function ProjectActionRail({
  boardAvailable,
  copiedBoard,
  graphOpen,
  onCopyBoard,
  onPreviewBoard,
  onSaveBoard,
  onScan,
  onToggleGraph,
  onToggleTasks,
  savedBoard,
  scanEnabled,
  taskCount,
  tasksOpen,
}: Pick<ProjectWorkspaceChromeProps,
  | 'boardAvailable'
  | 'copiedBoard'
  | 'graphOpen'
  | 'onCopyBoard'
  | 'onPreviewBoard'
  | 'onSaveBoard'
  | 'onScan'
  | 'onToggleGraph'
  | 'onToggleTasks'
  | 'savedBoard'
  | 'scanEnabled'
  | 'taskCount'
  | 'tasksOpen'
>) {
  return (
    <div className="project-workspace-chrome__actions" aria-label="Project actions">
      <ActionButton active={scanEnabled} icon={Search} label="Scan" state={scanEnabled ? 'scanned' : 'idle'} title="Scan selected folder contents" onClick={onScan} />
      {taskCount > 0 ? (
        <>
          <ActionButton icon={ClipboardList} label="Copy board" state={copiedBoard ? 'copied' : 'idle'} title="Copy generated project board" onClick={onCopyBoard} />
          <ActionButton icon={Eye} label="Preview" title="Preview generated project board" onClick={onPreviewBoard} />
          <ActionButton active={tasksOpen} icon={ListTodo} label="Tasks" title="Show project tasks" onClick={onToggleTasks} />
        </>
      ) : null}
      {boardAvailable ? (
        <ActionButton icon={ClipboardList} label="Save board" state={savedBoard ? 'saved' : 'idle'} title="Save generated board" onClick={onSaveBoard} />
      ) : null}
      <ActionButton active={graphOpen} icon={Network} label="Graph" title="Show project doc graph" onClick={onToggleGraph} />
    </div>
  )
}

function ActionButton({
  active = false,
  icon: Icon,
  label,
  state,
  title,
  onClick,
}: {
  active?: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  state?: string
  title: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="xs"
      className="project-workspace-chrome__action hover:text-foreground"
      title={title}
      aria-label={label}
      aria-pressed={active ? true : undefined}
      data-state={state}
      onClick={onClick}
    >
      <Icon className="size-3.5" />
    </Button>
  )
}

function documentLabel(document: GrimoireProjectDocument): string {
  if (document.kind === 'readme') return labelWithParent('README', document.relativePath)
  if (document.kind === 'architecture') return 'Architecture'
  if (document.kind === 'spec') return 'Spec'
  if (document.kind === 'todo') return 'Todo'
  if (document.kind === 'review') return 'Review'
  return document.title
}

function labelWithParent(label: string, relativePath: string): string {
  const parts = relativePath.split('/').filter(Boolean)
  const parent = parts.length > 1 ? parts.at(-2) : null
  return parent ? `${label} / ${parent}` : label
}
