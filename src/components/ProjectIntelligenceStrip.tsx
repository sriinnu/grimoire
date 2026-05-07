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
import { memo, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { SidebarSelection, VaultEntry } from '../types'
import {
  buildGrimoireProjectIntelligence,
  type GrimoireProjectDocument,
} from '../project-intelligence/grimoireAdapter'
import { useProjectFileContents } from '../project-intelligence/useProjectFileContents'
import { persistContent } from '../hooks/useSaveNote'
import { MarkdownContent } from './MarkdownContent'
import { ProjectLinkGraph } from './ProjectLinkGraph'
import { ProjectTaskList } from './ProjectTaskList'
import {
  buildProjectFileResults,
  createProjectDocContent,
  deriveProjectFolderPath,
  filterProjectFileResults,
  findExistingProjectPath,
  slugifyProjectDocName,
  type ProjectFileResult,
} from './projectWorkspaceUtils'

interface ProjectIntelligenceStripProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelectNote: (entry: VaultEntry) => void
}

function documentLabel(document: GrimoireProjectDocument): string {
  if (document.kind === 'readme') return 'README'
  if (document.kind === 'architecture') return 'Architecture'
  if (document.kind === 'spec') return 'Spec'
  if (document.kind === 'todo') return 'Todo'
  if (document.kind === 'review') return 'Review'
  return document.title
}

function Metric({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
      <Icon className="size-3" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function ProjectPreview({
  result,
  boardMarkdown,
}: {
  result: ProjectFileResult | null
  boardMarkdown: string | null
}) {
  const content = result?.markdown ? result.content : null
  const previewContent = boardMarkdown ?? content
  if (!previewContent) return null

  return (
    <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background px-3 py-2">
      <MarkdownContent content={previewContent} />
    </div>
  )
}

function ProjectIntelligenceStripInner({
  entries,
  selection,
  onSelectNote,
}: ProjectIntelligenceStripProps) {
  const [scanEnabled, setScanEnabled] = useState(false)
  const projectContents = useProjectFileContents(entries, selection, scanEnabled)
  const [copiedBoard, setCopiedBoard] = useState(false)
  const [savedBoard, setSavedBoard] = useState(false)
  const [query, setQuery] = useState('')
  const [includeSource, setIncludeSource] = useState(false)
  const [previewPath, setPreviewPath] = useState<string | null>(null)
  const [boardPreviewOpen, setBoardPreviewOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [createdDoc, setCreatedDoc] = useState<string | null>(null)
  const intelligence = useMemo(
    () => buildGrimoireProjectIntelligence(entries, selection, projectContents.contentByPath),
    [entries, projectContents.contentByPath, selection],
  )
  const fileResults = useMemo(
    () => buildProjectFileResults(entries, selection, projectContents.contentByPath, includeSource),
    [entries, includeSource, projectContents.contentByPath, selection],
  )
  const visibleResults = useMemo(() => filterProjectFileResults(fileResults, query), [fileResults, query])
  const selectedPreview = visibleResults.find((result) => result.path === previewPath) ?? null

  if (!intelligence) return null
  const hasDocuments = intelligence.documents.length > 0
  const projectFolderPath = deriveProjectFolderPath(intelligence.boardPath)
  const canCreateDoc = Boolean(projectFolderPath && query.trim())

  async function createProjectDoc() {
    if (!projectFolderPath || !query.trim()) return
    const title = query.trim()
    const basePath = `${projectFolderPath}/${slugifyProjectDocName(title)}.md`
    const path = findExistingProjectPath(entries, basePath)
      ? `${projectFolderPath}/${slugifyProjectDocName(title)}-${Date.now()}.md`
      : basePath

    await persistContent(path, createProjectDocContent(title))
    setCreatedDoc(path)
    window.setTimeout(() => setCreatedDoc(null), 1600)
  }

  return (
    <div className="border-b border-border/70 bg-card px-3 pb-2" data-testid="project-workspace-strip">
      <div className="flex flex-wrap items-center gap-1.5">
        <Metric icon={FileText} label={`${intelligence.markdownCount} md`} />
        {intelligence.otherCount > 0 && (
          <Metric icon={BookOpenText} label={`${intelligence.otherCount} other`} />
        )}
        {intelligence.issues.length > 0 && (
          <Metric icon={ListTodo} label={`${intelligence.issues.length} tasks`} />
        )}
        {intelligence.analytics.urgentCount > 0 && (
          <Metric icon={AlertCircle} label={`${intelligence.analytics.urgentCount} urgent`} />
        )}
        {projectContents.loading && <Metric icon={BookOpenText} label="scanning" />}
        {projectContents.skippedCount > 0 && (
          <Metric icon={BookOpenText} label={`${projectContents.skippedCount} skipped`} />
        )}
        {hasDocuments && <div className="mx-0.5 h-4 w-px bg-border" />}
        <Button
          type="button"
          variant={scanEnabled ? 'secondary' : 'ghost'}
          size="xs"
          className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
          title="Scan selected folder contents"
          onClick={() => setScanEnabled(true)}
        >
          <Search className="size-3.5" />
          <span>{projectContents.loading ? 'Scanning' : scanEnabled ? 'Scanned' : 'Scan'}</span>
        </Button>
        {intelligence.issues.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title="Copy generated project board"
            onClick={() => {
              void navigator.clipboard?.writeText(intelligence.boardMarkdown)
              setCopiedBoard(true)
              window.setTimeout(() => setCopiedBoard(false), 1200)
            }}
          >
            <ClipboardList className="size-3.5" />
            <span>{copiedBoard ? 'Copied' : 'Board'}</span>
          </Button>
        )}
        {intelligence.issues.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title="Preview generated project board"
            onClick={() => {
              setBoardPreviewOpen((open) => !open)
              setPreviewPath(null)
            }}
          >
            <Eye className="size-3.5" />
            <span>Preview</span>
          </Button>
        )}
        {intelligence.issues.length > 0 && (
          <Button
            type="button"
            variant={tasksOpen ? 'secondary' : 'ghost'}
            size="xs"
            className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title="Show project tasks"
            onClick={() => setTasksOpen((open) => !open)}
          >
            <ListTodo className="size-3.5" />
            <span>Tasks</span>
          </Button>
        )}
        {intelligence.boardPath && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title={`Save generated board to ${intelligence.boardPath}`}
            onClick={() => {
              void persistContent(intelligence.boardPath ?? '', intelligence.boardMarkdown).then(() => {
                setSavedBoard(true)
                window.setTimeout(() => setSavedBoard(false), 1200)
              })
            }}
          >
            <ClipboardList className="size-3.5" />
            <span>{savedBoard ? 'Saved' : 'Save Board'}</span>
          </Button>
        )}
        <Button
          type="button"
          variant={graphOpen ? 'secondary' : 'ghost'}
          size="xs"
          className="h-7 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
          title="Show project doc graph"
          onClick={() => setGraphOpen((open) => !open)}
        >
          <Network className="size-3.5" />
          <span>Graph</span>
        </Button>
        {intelligence.documents.map((document) => (
          <Button
            key={document.relativePath}
            type="button"
            variant="ghost"
            size="xs"
            className="h-7 max-w-32 rounded-md px-2 text-[11px] text-muted-foreground hover:text-foreground"
            title={document.title}
            onClick={() => onSelectNote(document.entry)}
          >
            <span className="truncate">{documentLabel(document)}</span>
          </Button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search project docs..."
            className="h-8 rounded-md border-border bg-background pl-7 text-xs"
            aria-label="Search project docs"
          />
        </div>
        <Button
          type="button"
          variant={includeSource ? 'secondary' : 'ghost'}
          size="icon-sm"
          className="size-8"
          title={includeSource ? 'Hide source files' : 'Show source files'}
          aria-label={includeSource ? 'Hide source files' : 'Show source files'}
          onClick={() => {
            setIncludeSource((value) => !value)
            setScanEnabled(true)
          }}
        >
          <Code2 className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          title={createdDoc ?? 'Create project doc'}
          aria-label="Create project doc"
          disabled={!canCreateDoc}
          onClick={() => void createProjectDoc()}
        >
          <FilePlus2 className="size-3.5" />
        </Button>
      </div>
      {(query.trim() || includeSource) && (
        <div className="mt-1.5 grid max-h-28 gap-1 overflow-y-auto">
          {visibleResults.map((result) => (
            <div key={result.path} className="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 hover:bg-muted/60">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-6 min-w-0 flex-1 justify-start rounded-md px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                title={result.path}
                onClick={() => onSelectNote(result.entry)}
              >
                <span className="truncate">{result.label}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                title="Preview file"
                aria-label={`Preview ${result.label}`}
                disabled={!result.markdown}
                onClick={() => {
                  setPreviewPath(result.path)
                  setBoardPreviewOpen(false)
                }}
              >
                <Eye className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      <ProjectPreview
        result={selectedPreview}
        boardMarkdown={boardPreviewOpen ? intelligence.boardMarkdown : null}
      />
      {graphOpen && (
        <ProjectLinkGraph entries={entries} selection={selection} onSelectNote={onSelectNote} />
      )}
      {tasksOpen && (
        <ProjectTaskList issues={intelligence.issues} entries={entries} onSelectNote={onSelectNote} />
      )}
    </div>
  )
}

/** Compact project intelligence strip shown in folder/project note-list views. */
export const ProjectIntelligenceStrip = memo(ProjectIntelligenceStripInner)
