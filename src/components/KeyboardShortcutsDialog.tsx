import { useId, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { allShortcutEntries } from '../lib/keyboardShortcuts/registry'
import { filterShortcutGroups, groupShortcutEntries, type ShortcutSheetRow } from '../lib/keyboardShortcuts/sheet'
import type { ShortcutPlatform } from '../lib/keyboardShortcuts/chords'
import { isMac } from '../utils/platform'

interface KeyboardShortcutsDialogProps {
  open: boolean
  onClose: () => void
  /** Test seam; defaults to the running platform. */
  platform?: ShortcutPlatform
}

function KeyCaps({ caps, typed }: { caps: string[]; typed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {typed ? <span className="text-[11px] text-[var(--muted-foreground)]">type</span> : null}
      {caps.map((cap, index) => (
        <kbd
          key={`${cap}-${index}`}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-b-2 border-[var(--border)] bg-[var(--surface-panel)] px-1.5 font-sans text-[11px] font-medium text-[var(--foreground)]"
        >
          {cap}
        </kbd>
      ))}
    </span>
  )
}

function ShortcutRow({ row }: { row: ShortcutSheetRow }) {
  return (
    <li className="flex items-center justify-between gap-3 py-1.5" data-testid={`shortcut-${row.entry.id}`}>
      <span className="min-w-0 text-[13px] text-[var(--foreground)]">{row.entry.label}</span>
      <span className="flex shrink-0 items-center gap-1.5">
        {row.caps.map((caps, index) => (
          <span key={index} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span className="text-[11px] text-[var(--muted-foreground)]">or</span> : null}
            <KeyCaps caps={caps} typed={row.entry.typed} />
          </span>
        ))}
      </span>
    </li>
  )
}

/** Cheat sheet of every registered shortcut, grouped and filterable. */
export function KeyboardShortcutsDialog({ open, onClose, platform }: KeyboardShortcutsDialogProps) {
  const [query, setQuery] = useState('')
  const filterId = useId()
  const resolvedPlatform: ShortcutPlatform = platform ?? (isMac() ? 'mac' : 'other')
  const groups = useMemo(
    () => groupShortcutEntries(allShortcutEntries(), resolvedPlatform),
    [resolvedPlatform],
  )
  const visibleGroups = useMemo(() => filterShortcutGroups(groups, query), [groups, query])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent
        className="keyboard-shortcuts-dialog gap-3 border-[var(--border)] bg-[var(--surface-panel)] text-[var(--foreground)] sm:max-w-3xl"
        data-testid="keyboard-shortcuts-dialog"
      >
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-[var(--foreground)]">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="sr-only">
            Every keyboard shortcut in Grimoire, grouped by area. Type to filter.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={filterId} className="sr-only">Filter shortcuts</label>
        <input
          id={filterId}
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter shortcuts"
          className="h-9 w-full rounded-md border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--primary)] focus-visible:ring-1 focus-visible:ring-[var(--primary)]"
        />
        {visibleGroups.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--muted-foreground)]" role="status">
            No shortcuts match “{query.trim()}”
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {visibleGroups.map((group) => (
              <section key={group.id} aria-labelledby={`${filterId}-${group.id}`}>
                <h3
                  id={`${filterId}-${group.id}`}
                  className="mb-1 text-[11px] font-semibold tracking-wide text-[var(--muted-foreground)] uppercase"
                >
                  {group.label}
                </h3>
                <ul className="divide-y divide-[var(--border)]">
                  {group.rows.map((row) => <ShortcutRow key={row.entry.id} row={row} />)}
                </ul>
              </section>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
