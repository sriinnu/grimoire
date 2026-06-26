import { Glyph } from './glyphs/Glyph'
import { Button } from '@/components/ui/button'
import { resolveProjectIssueEntry } from '../project-intelligence/sourceTaskEntries'
import { canMarkSourceTaskDone, projectIssueKey } from '../project-intelligence/sourceTaskUpdates'
import type { ExtractedProjectIssue } from '../project-intelligence/types'
import type { VaultEntry } from '../types'

interface ProjectTaskListProps {
  issues: ExtractedProjectIssue[]
  entries: VaultEntry[]
  onSelectNote: (entry: VaultEntry) => void
  onResolveIssue?: (issue: ExtractedProjectIssue) => void | Promise<void>
  resolvingIssueKey?: string | null
}

function issueTone(issue: ExtractedProjectIssue): string {
  if (issue.priority === 'critical' || issue.type === 'fixme') return 'text-destructive'
  if (issue.priority === 'high') return 'text-foreground'
  return 'text-muted-foreground'
}

/** Compact project TODO/FIXME list for folder workspace triage. */
export function ProjectTaskList({
  issues,
  entries,
  onSelectNote,
  onResolveIssue,
  resolvingIssueKey,
}: ProjectTaskListProps) {
  const visibleIssues = issues.slice(0, 12)
  if (issues.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-border bg-background px-2 py-2" data-testid="project-task-list">
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Glyph name="task" size={14} />
        <span>{issues.length} project tasks</span>
      </div>
      <div className="grid gap-1">
        {visibleIssues.map((issue, index) => {
          const resolution = resolveProjectIssueEntry(issue, entries)
          const entry = resolution.status === 'resolved' ? resolution.entry : null
          const key = projectIssueKey(issue)
          const canResolve = Boolean(entry && onResolveIssue && canMarkSourceTaskDone(issue))
          const sourceTitle = resolution.status === 'ambiguous'
            ? 'Multiple source files match this task'
            : issue.sourceFile
          return (
            <div key={`${key}:${index}`} className="flex min-w-0 items-center gap-1 rounded-md hover:bg-muted/60">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-7 min-w-0 flex-1 justify-start rounded-md px-1.5 text-[11px]"
                title={sourceTitle}
                disabled={!entry}
                onClick={() => entry && onSelectNote(entry)}
              >
                <Glyph name="warning" size={12} className={`shrink-0 ${issueTone(issue)}`} />
                <span className="min-w-0 flex-1 truncate text-left">{issue.title}</span>
                <span className="shrink-0 text-muted-foreground">L{issue.sourceLine}</span>
                <span className="shrink-0 text-muted-foreground">{issue.type}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                title="Mark source task done"
                aria-label={`Mark ${issue.title} done`}
                disabled={!canResolve || resolvingIssueKey === key}
                onClick={() => {
                  if (canResolve) void onResolveIssue?.(issue)
                }}
              >
                <Glyph name="task" size={14} />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
