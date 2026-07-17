import { describe, expect, it } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'
import { schema } from '../components/editorSchema'
import {
  applyBlocksToEditor,
  cacheEditorState,
  resolveBlocksForTarget,
  serializeEditorBody,
} from './editorTabSwapCache'
import type { CachedTabState, Editor } from './editorTabSwapTypes'

const NOTE_WITH_UNLABELED_FENCE = [
  'Intro paragraph.',
  '',
  '```',
  'def build(entries):',
  '    import json',
  '    print(len(entries))',
  '```',
  '',
].join('\n')

function createEditor(): Editor {
  return BlockNoteEditor.create({ schema }) as unknown as Editor
}

interface BlockShape {
  id?: string
  type?: string
  props?: { language?: string }
  children?: BlockShape[]
}

function findCodeBlock(blocks: BlockShape[]): BlockShape | undefined {
  for (const block of blocks) {
    if (block.type === 'codeBlock') return block
    const nested = block.children?.length ? findCodeBlock(block.children) : undefined
    if (nested) return nested
  }
  return undefined
}

describe('code language detection stays display-only', () => {
  it('parses unlabeled fences without injecting a language into cached blocks', async () => {
    const editor = createEditor()
    const cache = new Map<string, CachedTabState>()

    const state = await resolveBlocksForTarget({
      editor,
      cache,
      targetPath: 'note.md',
      content: NOTE_WITH_UNLABELED_FENCE,
    })

    // cached blocks mirror the source markdown: parse default only
    expect(findCodeBlock(state.blocks)?.props?.language).toBe('text')
    expect(findCodeBlock(cache.get('note.md')!.blocks)?.props?.language).toBe('text')
  })

  it('detects after insertion (suppressed), strips at serialize time, and keeps user overrides', async () => {
    const editor = createEditor()
    const cache = new Map<string, CachedTabState>()
    const suppressChangeRef = { current: false }
    const state = await resolveBlocksForTarget({
      editor,
      cache,
      targetPath: 'note.md',
      content: NOTE_WITH_UNLABELED_FENCE,
    })

    const changesWhileSuppressed: boolean[] = []
    const unsubscribe = (editor as unknown as {
      onChange: (cb: () => void) => (() => void) | undefined
    }).onChange(() => changesWhileSuppressed.push(suppressChangeRef.current))

    applyBlocksToEditor(editor, state.blocks, 0, suppressChangeRef)

    // display: the live document now carries the detected language
    expect(findCodeBlock(editor.document as BlockShape[])?.props?.language).toBe('python')
    // dirty-state: every editor change during apply + injection was suppressed
    expect(changesWhileSuppressed.length).toBeGreaterThan(0)
    expect(changesWhileSuppressed.every(Boolean)).toBe(true)
    unsubscribe?.()

    // persistence: the serialized body keeps the fence unlabeled
    const serialized = serializeEditorBody(editor)
    expect(serialized).toContain('```\ndef build(entries):')
    expect(serialized).not.toContain('```python')

    // explicit user choice via the language picker persists
    const codeBlockId = findCodeBlock(editor.document as BlockShape[])?.id
    editor.updateBlock(codeBlockId!, { props: { language: 'rust' } })
    expect(serializeEditorBody(editor)).toContain('```rust\ndef build(entries):')
  })

  it('never leaks the injected language through a cache round-trip', async () => {
    const editor = createEditor()
    const cache = new Map<string, CachedTabState>()
    const suppressChangeRef = { current: false }
    const state = await resolveBlocksForTarget({
      editor,
      cache,
      targetPath: 'note.md',
      content: NOTE_WITH_UNLABELED_FENCE,
    })
    applyBlocksToEditor(editor, state.blocks, 0, suppressChangeRef)
    expect(findCodeBlock(editor.document as BlockShape[])?.props?.language).toBe('python')

    // simulate the swap-away path caching the live document
    cacheEditorState(cache, 'note.md', {
      blocks: editor.document,
      scrollTop: 0,
      sourceContent: NOTE_WITH_UNLABELED_FENCE,
    })
    expect(findCodeBlock(cache.get('note.md')!.blocks)?.props?.language).toBe('')

    // reopening from cache re-detects for display and still serializes clean
    applyBlocksToEditor(editor, cache.get('note.md')!.blocks, 0, suppressChangeRef)
    expect(findCodeBlock(editor.document as BlockShape[])?.props?.language).toBe('python')
    const serialized = serializeEditorBody(editor)
    expect(serialized).toContain('```\ndef build(entries):')
    expect(serialized).not.toContain('```python')
  })
})
