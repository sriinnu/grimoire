import { Eye } from 'lucide-react'
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { SidebarSelection, VaultEntry } from '../types'
import { buildGrimoireProjectIntelligence } from '../project-intelligence/grimoireAdapter'
import {
  readProjectFileContent,
  useProjectFileContents,
} from '../project-intelligence/useProjectFileContents'
import { persistContent } from '../hooks/useSaveNote'
import { resolveSourceTaskUpdate } from '../project-intelligence/sourceTaskActions'
import { projectIssueKey } from '../project-intelligence/sourceTaskUpdates'
import {
  mergeProjectContentByPath,
  pruneSyncedProjectContentOverrides,
} from '../project-intelligence/sourceTaskEntries'
import type { ExtractedProjectIssue } from '../project-intelligence/types'
import {
  buildProjectFileResults,
  createProjectDocContent,
  deriveProjectFolderPath,
  filterProjectFileResults,
  findExistingProjectPath,
  slugifyProjectDocName,
  type ProjectFileResult,
} from './projectWorkspaceUtils'
import { ProjectWorkspaceChrome } from './ProjectWorkspaceChrome'

function projectScopeLabel(selection: SidebarSelection): string {
  if (selection.kind !== 'folder') return 'Current view'
  const parts = selection.path.replaceAll('\\', '/').split('/').filter(Boolean)
  return parts.slice(-4).join(' / ') || 'Vault folder'
}

const MarkdownContentPreview = lazy(async () => ({ default: (await import('./MarkdownContent')).MarkdownContent }))
const ProjectLinkGraphPanel = lazy(async () => ({ default: (await import('./ProjectLinkGraph')).ProjectLinkGraph }))
const ProjectTaskListPanel = lazy(async () => ({ default: (await import('./ProjectTaskList')).ProjectTaskList }))

interface ProjectIntelligenceStripProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelectNote: (entry: VaultEntry) => void
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
    <div className="grimoire-panel-reveal mt-2 max-h-48 overflow-y-auto rounded-md border border-border bg-background px-3 py-2">
      <Suspense fallback={<div className="text-[11px] text-muted-foreground">Loading preview...</div>}>
        <MarkdownContentPreview content={previewContent} />
      </Suspense>
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
  const [contentOverrides, setContentOverrides] = useState<ReadonlyMap<string, string>>(new Map())
  const [resolvingIssueKey, setResolvingIssueKey] = useState<string | null>(null)
  const [taskUpdateError, setTaskUpdateError] = useState<string | null>(null)
  const selectionKey = selection.kind === 'folder' ? `folder:${selection.path}` : selection.kind
  const contentByPath = useMemo(
    () => mergeProjectContentByPath(projectContents.contentByPath, contentOverrides),
    [contentOverrides, projectContents.contentByPath],
  )
  const intelligence = useMemo(
    () => buildGrimoireProjectIntelligence(entries, selection, contentByPath),
    [contentByPath, entries, selection],
  )
  const fileResults = useMemo(
    () => buildProjectFileResults(entries, selection, contentByPath, includeSource),
    [contentByPath, entries, includeSource, selection],
  )
  const visibleResults = useMemo(() => filterProjectFileResults(fileResults, query), [fileResults, query])
  const selectedPreview = visibleResults.find((result) => result.path === previewPath) ?? null

  useEffect(() => {
    setContentOverrides(new Map())
    setTaskUpdateError(null)
    setResolvingIssueKey(null)
  }, [selectionKey])

  useEffect(() => {
    if (projectContents.loading || contentOverrides.size === 0) return
    setContentOverrides((previous) => pruneSyncedProjectContentOverrides(
      projectContents.contentByPath,
      previous,
    ))
  }, [contentOverrides.size, projectContents.contentByPath, projectContents.loading])

  const resolveSourceTask = useCallback(async (issue: ExtractedProjectIssue) => {
    const key = projectIssueKey(issue)
    setResolvingIssueKey(key)
    try {
      const result = await resolveSourceTaskUpdate(issue, entries, readProjectFileContent, persistContent)
      if (result.status === 'conflict') {
        setTaskUpdateError(result.reason)
        return
      }

      setContentOverrides((previous) => new Map(previous).set(result.entry.path, result.content))
      setTaskUpdateError(null)
      setScanEnabled(true)
    } catch {
      setTaskUpdateError('Source task update failed.')
    } finally {
      setResolvingIssueKey(null)
    }
  }, [entries])

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
    <div className="project-workspace-strip grimoire-panel-reveal" data-testid="project-workspace-strip">
      <ProjectWorkspaceChrome
        boardAvailable={Boolean(intelligence.boardPath)}
        canCreateDoc={canCreateDoc}
        copiedBoard={copiedBoard}
        createdDoc={createdDoc}
        documents={hasDocuments ? intelligence.documents : []}
        graphOpen={graphOpen}
        includeSource={includeSource}
        loading={projectContents.loading}
        markdownCount={intelligence.markdownCount}
        onCopyBoard={() => {
          void navigator.clipboard?.writeText(intelligence.boardMarkdown)
          setCopiedBoard(true)
          window.setTimeout(() => setCopiedBoard(false), 1200)
        }}
        onCreateDoc={() => void createProjectDoc()}
        onPreviewBoard={() => {
          setBoardPreviewOpen((open) => !open)
          setPreviewPath(null)
        }}
        onQueryChange={setQuery}
        onSaveBoard={() => {
          void persistContent(intelligence.boardPath ?? '', intelligence.boardMarkdown).then(() => {
            setSavedBoard(true)
            window.setTimeout(() => setSavedBoard(false), 1200)
          })
        }}
        onScan={() => setScanEnabled(true)}
        onSelectNote={onSelectNote}
        onToggleGraph={() => setGraphOpen((open) => !open)}
        onToggleSource={() => {
          setIncludeSource((value) => !value)
          setScanEnabled(true)
        }}
        onToggleTasks={() => setTasksOpen((open) => !open)}
        otherCount={intelligence.otherCount}
        query={query}
        savedBoard={savedBoard}
        scanEnabled={scanEnabled}
        skippedCount={projectContents.skippedCount}
        scopeLabel={projectScopeLabel(selection)}
        taskCount={intelligence.issues.length}
        tasksOpen={tasksOpen}
        urgentCount={intelligence.analytics.urgentCount}
      />
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
        <Suspense fallback={null}>
          <ProjectLinkGraphPanel entries={entries} selection={selection} onSelectNote={onSelectNote} />
        </Suspense>
      )}
      {tasksOpen && (
        <Suspense fallback={null}>
          <ProjectTaskListPanel
            issues={intelligence.issues}
            entries={entries}
            onSelectNote={onSelectNote}
            onResolveIssue={resolveSourceTask}
            resolvingIssueKey={resolvingIssueKey}
          />
        </Suspense>
      )}
      {taskUpdateError && (
        <div className="mt-1.5 text-[11px] text-destructive" role="status">
          {taskUpdateError}
        </div>
      )}
    </div>
  )
}

/** Compact project intelligence strip shown in folder/project note-list views. */
export const ProjectIntelligenceStrip = memo(ProjectIntelligenceStripInner)
