import { NotebookTabs } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VaultEntry } from '../../types'
import { relativeDate } from '../../utils/noteListHelpers'

function recentEmptyCopy(protectedCount: number): string {
  if (protectedCount === 0) return 'Create the first note.'
  const noteLabel = protectedCount === 1 ? 'note' : 'notes'
  return `${protectedCount} protected recent ${noteLabel} held in private lanes.`
}

function RecentNoteButton({ entry, onOpen }: { entry: VaultEntry; onOpen: (entry: VaultEntry) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="vault-dashboard__recent"
      onClick={() => onOpen(entry)}
    >
      <span className="vault-dashboard__recent-title">{entry.title}</span>
      <span className="vault-dashboard__recent-meta">
        {entry.isA ?? 'Note'} - {relativeDate(entry.modifiedAt ?? entry.createdAt)}
      </span>
    </Button>
  )
}

/** Renders source-safe recent note re-entry without exposing protected local lanes. */
export function DashboardRecentNotesPanel({
  entries,
  onOpenNote,
  protectedCount,
}: {
  entries: VaultEntry[]
  onOpenNote: (entry: VaultEntry) => void
  protectedCount: number
}) {
  return (
    <div className="vault-dashboard__panel vault-dashboard__panel--wide">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Recent Notes</div>
          <h2>Pick up the thread.</h2>
        </div>
        <NotebookTabs size={18} />
      </div>
      <div className="vault-dashboard__recent-list">
        {entries.length > 0 ? entries.map((entry) => (
          <RecentNoteButton key={entry.path} entry={entry} onOpen={onOpenNote} />
        )) : (
          <div className="vault-dashboard__empty">{recentEmptyCopy(protectedCount)}</div>
        )}
      </div>
    </div>
  )
}
