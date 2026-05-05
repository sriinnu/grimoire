import { AlertCircle, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ExtractedProjectIssue } from '../project-intelligence/types'
import type { VaultEntry } from '../types'

interface ProjectTaskListProps {
  issues: ExtractedProjectIssue[]
  entries: VaultEntry[]
  onSelectNote: (entry: VaultEntry) => void
}

function issueTone(issue: ExtractedProjectIssue): string {
  if (issue.priority === 'critical' || issue.type === 'fixme') return 'text-destructive'
  if (issue.priority === 'high') return 'text-foreground'
  return 'text-muted-foreground'
}

function resolveIssueEntry(issue: ExtractedProjectIssue, entries: VaultEntry[]): VaultEntry | null {
  const normalizedSource = issue.sourceFile.replace(/\\/g, '/').toLowerCase()
  return entries.find((entry) =>
    entry.path.replace(/\\/g, '/').toLowerCase().endsWith(normalizedSource),
  ) ?? null
}

/** Compact project TODO/FIXME list for folder workspace triage. */
export function ProjectTaskList({ issues, entries, onSelectNote }: ProjectTaskListProps) {
  const visibleIssues = issues.slice(0, 12)
  if (issues.length === 0) return null

  return (
    <div className="mt-2 rounded-md border border-border bg-background px-2 py-2" data-testid="project-task-list">
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <ListChecks className="size-3.5" />
        <span>{issues.length} project tasks</span>
      </div>
      <div className="grid gap-1">
        {visibleIssues.map((issue, index) => {
          const entry = resolveIssueEntry(issue, entries)
          return (
            <Button
              key={`${issue.sourceFile}:${issue.title}:${index}`}
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 min-w-0 justify-start rounded-md px-1.5 text-[11px]"
              title={issue.sourceFile}
              disabled={!entry}
              onClick={() => entry && onSelectNote(entry)}
            >
              <AlertCircle className={`size-3 shrink-0 ${issueTone(issue)}`} />
              <span className="min-w-0 flex-1 truncate text-left">{issue.title}</span>
              <span className="shrink-0 text-muted-foreground">L{issue.sourceLine}</span>
              <span className="shrink-0 text-muted-foreground">{issue.type}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
