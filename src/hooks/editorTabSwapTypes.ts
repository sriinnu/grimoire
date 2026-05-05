import type { useCreateBlockNote } from '@blocknote/react'
import type { VaultEntry } from '../types'

export interface Tab {
  entry: VaultEntry
  content: string
}

export type Editor = ReturnType<typeof useCreateBlockNote>

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- BlockNote block arrays are schema-dependent.
export type EditorBlocks = any[]

export type CachedTabState = {
  blocks: EditorBlocks
  scrollTop: number
  sourceContent: string
}

export type PendingLocalContent = {
  path: string
  content: string
}

export interface TabSwapState {
  cache: Map<string, CachedTabState>
  prevPath: string | null
  pathChanged: boolean
  activeTab: Tab | undefined
  previousTab: Tab | undefined
  rawModeJustEnded: boolean
}

export const TAB_STATE_CACHE_LIMIT = 24
