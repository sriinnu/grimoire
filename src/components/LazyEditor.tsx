import { lazy, Suspense } from 'react'
import type { EditorProps } from './Editor'
import { EditorEmptyState } from './EditorEmptyState'
import { EditorLoadingState } from './EditorLoadingState'

const EditorSurface = lazy(async () => {
  const module = await import('./Editor')
  return { default: module.Editor }
})

/** Defers the rich editor engine until the app shell has resolved the active vault. */
export function LazyEditor(props: EditorProps) {
  if (props.tabs.length === 0 && !props.showAIChat) {
    return (
      <div className="editor flex flex-col min-h-0 overflow-hidden bg-background text-foreground">
        <EditorEmptyState />
      </div>
    )
  }

  return (
    <Suspense fallback={<EditorLoadingState />}>
      <EditorSurface {...props} />
    </Suspense>
  )
}
