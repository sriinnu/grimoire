import { lazy, Suspense } from 'react'
import type { NoteListSurfaceProps } from './NoteList'
import { useStableFunctionProps } from '../hooks/useStableHandlers'

const NoteListSurface = lazy(async () => {
  const module = await import('./NoteList')
  return { default: module.NoteList }
})

/** Defers the virtualized note-list route until the dashboard gives way to notes. */
export function LazyNoteList(props: NoteListSurfaceProps) {
  // Stable handler identities so the memoised list skips keystroke re-renders.
  const stableProps = useStableFunctionProps(props)
  return (
    <Suspense
      fallback={(
        <div
          className="flex h-full min-h-0 flex-col border-r border-border bg-card text-foreground"
          data-testid="note-list-loading"
        />
      )}
    >
      <NoteListSurface {...stableProps} />
    </Suspense>
  )
}
