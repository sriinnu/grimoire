import {
  AlertCircle,
  BookOpenText,
  ClipboardList,
  Code2,
  Eye,
  FilePlus2,
  FileText,
  ListTodo,
  Network,
  Search,
} from 'lucide-react'
import type { ComponentType } from 'react'
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
  graphOpen: boolean
  includeSource: boolean
  loading: boolean
  markdownCount: number
  onCopyBoard: () => void
  onCreateDoc: () => void
  onPreviewBoard: () => void
  onQueryChange: (value: string) => void
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

/** Compact, grouped chrome for the project-scoped note list. */
export function ProjectWorkspaceChrome({
  boardAvailable,
  canCreateDoc,
  copiedBoard,
  createdDoc,
  documents,
  graphOpen,
  includeSource,
  loading,
  markdownCount,
  onCopyBoard,
  onCreateDoc,
  onPreviewBoard,
  onQueryChange,
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
      <div className="project-workspace-chrome__overview">
        <div className="project-workspace-chrome__scope">
          <span className="project-workspace-chrome__scope-label">Project</span>
          <span className="project-workspace-chrome__scope-path" title={scopeLabel}>{scopeLabel}</span>
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
      </div>

      <div className="project-workspace-chrome__search">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search project docs..."
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
            title={includeSource ? 'Hide source files' : 'Show source files'}
            aria-label={includeSource ? 'Hide source files' : 'Show source files'}
            onClick={onToggleSource}
          >
            <Code2 className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="project-workspace-chrome__icon-button size-8 shrink-0"
            title={createdDoc ?? 'Create project doc'}
            aria-label="Create project doc"
            disabled={!canCreateDoc}
            onClick={onCreateDoc}
          >
            <FilePlus2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {documents.length > 0 ? (
        <div className="project-workspace-chrome__docs">
          <span className="project-workspace-chrome__label">Docs</span>
          <div className="project-workspace-chrome__docs-scroll">
            {documents.map((document) => (
              <Button
                key={document.relativePath}
                type="button"
                variant="outline"
                size="xs"
                className="project-workspace-chrome__doc hover:text-foreground"
                title={document.title}
                onClick={() => onSelectNote(document.entry)}
              >
                <span className="truncate">{documentLabel(document)}</span>
              </Button>
            ))}
          </div>
        </div>
      ) : null}
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
  return (
    <div className="project-workspace-chrome__metrics" aria-label="Project scope">
      <Metric icon={FileText} label={`${markdownCount} md`} />
      {otherCount > 0 ? <Metric icon={BookOpenText} label={`${otherCount} other`} /> : null}
      {taskCount > 0 ? <Metric icon={ListTodo} label={`${taskCount} tasks`} /> : null}
      {urgentCount > 0 ? <Metric icon={AlertCircle} label={`${urgentCount} urgent`} /> : null}
      {loading ? <Metric icon={BookOpenText} label="scanning" /> : null}
      {skippedCount > 0 ? <Metric icon={BookOpenText} label={`${skippedCount} skipped`} /> : null}
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
      <ActionButton active={scanEnabled} icon={Search} label={scanEnabled ? 'Scanned' : 'Scan'} title="Scan selected folder contents" onClick={onScan} />
      {taskCount > 0 ? (
        <>
          <ActionButton icon={ClipboardList} label={copiedBoard ? 'Copied' : 'Board'} title="Copy generated project board" onClick={onCopyBoard} />
          <ActionButton icon={Eye} label="Preview" title="Preview generated project board" onClick={onPreviewBoard} />
          <ActionButton active={tasksOpen} icon={ListTodo} label="Tasks" title="Show project tasks" onClick={onToggleTasks} />
        </>
      ) : null}
      {boardAvailable ? (
        <ActionButton icon={ClipboardList} label={savedBoard ? 'Saved' : 'Save'} title="Save generated board" onClick={onSaveBoard} />
      ) : null}
      <ActionButton active={graphOpen} icon={Network} label="Graph" title="Show project doc graph" onClick={onToggleGraph} />
    </div>
  )
}

function ActionButton({
  active = false,
  icon: Icon,
  label,
  title,
  onClick,
}: {
  active?: boolean
  icon: ComponentType<{ className?: string }>
  label: string
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
      onClick={onClick}
    >
      <Icon className="size-3.5" />
    </Button>
  )
}

function Metric({ icon: Icon, label }: { icon: ComponentType<{ className?: string }>; label: string }) {
  return (
    <span className="project-workspace-chrome__metric">
      <Icon className="size-3" />
      <span className="truncate">{label}</span>
    </span>
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
