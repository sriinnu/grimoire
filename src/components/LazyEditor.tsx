import { Suspense } from 'react'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import type { EditorProps } from './Editor'
import { EditorEmptyState } from './EditorEmptyState'
import { EditorLoadingState } from './EditorLoadingState'
import { preloadEditor } from './editorPreload'

const EditorSurface = lazyWithRetry(async () => {
  const module = await preloadEditor()
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
