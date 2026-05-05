import { useEffect, useCallback, useRef } from 'react'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  LinkToolbarController,
  SideMenuController,
} from '@blocknote/react'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { useEditorTheme } from '../hooks/useTheme'
import { useImageDrop } from '../hooks/useImageDrop'
import { useNoteWikilinkDrop } from '../hooks/useNoteWikilinkDrop'
import { observeNativeTextAssistanceDisabled } from '../lib/nativeTextAssistance'
import { WikilinkSuggestionMenu, type WikilinkSuggestionItem } from './WikilinkSuggestionMenu'
import type { VaultEntry } from '../types'
import { _wikilinkEntriesRef } from './editorSchema'
import { useBlockNoteSideMenuHoverGuard } from './blockNoteSideMenuHoverGuard'
import {
  GrimoireFormattingToolbar,
  GrimoireFormattingToolbarController,
} from './grimoireEditorFormatting'
import { GrimoireSideMenu } from './grimoireBlockNoteSideMenu'
import { useEditorLinkActivation } from './useEditorLinkActivation'
import { findNearestTextCursorBlock } from './blockNoteCursorTarget'
import {
  GrimoireLinkToolbar,
  SharedContextBlockNoteView,
} from './singleEditorChrome'
import { handleToolbarMouseDownCapture } from './singleEditorToolbarEvents'
import { useSingleEditorSuggestionItems } from './singleEditorSuggestions'

const TEST_TABLE_MARKDOWN = `| Head 1 | Head 2 | Head 3 |
| --- | --- | --- |
| A | B | C |
| D | E | F |
`
const CONTAINER_CLICK_IGNORE_SELECTOR = [
  '[contenteditable="true"]',
  '.bn-formatting-toolbar',
  '.bn-link-toolbar',
  '.bn-side-menu',
  '.bn-form-popover',
  '[role="menu"]',
  '[role="dialog"]',
].join(', ')
type TestTableBlock = {
  type?: string
  content?: { type?: string; columnWidths?: Array<number | null> }
}

function applySeededColumnWidths(
  parsedBlocks: Array<TestTableBlock>,
  columnWidths?: Array<number | null>,
) {
  if (!columnWidths) return

  const tableBlock = parsedBlocks[0]
  if (tableBlock?.type !== 'table') return

  const tableContent = tableBlock.content
  if (tableContent?.type !== 'tableContent') return

  tableContent.columnWidths = [...columnWidths]
}

async function seedEditorWithTestTable(
  editor: ReturnType<typeof useCreateBlockNote>,
  columnWidths?: Array<number | null>,
) {
  const parsedBlocks = await Promise.resolve(
    editor.tryParseMarkdownToBlocks(TEST_TABLE_MARKDOWN),
  ) as Array<TestTableBlock>

  applySeededColumnWidths(parsedBlocks, columnWidths)

  const tableHtml = editor.blocksToHTMLLossy([
    ...parsedBlocks,
    { type: 'paragraph', content: [], children: [] },
  ] as typeof editor.document)
  editor._tiptapEditor.commands.setContent(tableHtml)
  editor.focus()
}

function useSeedBlockNoteTableBridge(editor: ReturnType<typeof useCreateBlockNote>) {
  useEffect(() => {
    const seedBlockNoteTable = (columnWidths?: Array<number | null>) => (
      seedEditorWithTestTable(editor, columnWidths)
    )

    window.__grimoireTest = {
      ...window.__grimoireTest,
      seedBlockNoteTable,
    }

    return () => {
      if (window.__grimoireTest?.seedBlockNoteTable === seedBlockNoteTable) {
        delete window.__grimoireTest.seedBlockNoteTable
      }
    }
  }, [editor])
}

function shouldIgnoreContainerClick(target: HTMLElement) {
  return Boolean(target.closest(CONTAINER_CLICK_IGNORE_SELECTOR))
}

function isSelectionInsideElement(element: HTMLElement): boolean {
  const selection = window.getSelection()
  const anchorNode = selection?.anchorNode ?? null
  const anchorElement = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement ?? null
  return Boolean(anchorElement && element.contains(anchorElement))
}

const TITLE_HEADING_SELECTOR = 'h1, [data-content-type="heading"][data-level="1"], [data-content-type="heading"]:not([data-level])'
const TITLE_HEADING_WRAPPER_SELECTOR = '.bn-block-outer, .bn-block'

function findTitleHeadingElement(target: HTMLElement): HTMLElement | null {
  const directHeading = target.closest<HTMLElement>(TITLE_HEADING_SELECTOR)
  if (directHeading) return directHeading

  const titleWrapper = target.closest<HTMLElement>(TITLE_HEADING_WRAPPER_SELECTOR)
  return titleWrapper?.querySelector<HTMLElement>(TITLE_HEADING_SELECTOR) ?? null
}

function queueTitleHeadingCursorRepair(
  target: HTMLElement,
  editor: ReturnType<typeof useCreateBlockNote>,
): boolean {
  const titleHeading = findTitleHeadingElement(target)
  if (!titleHeading) return false

  queueMicrotask(() => {
    if (isSelectionInsideElement(titleHeading)) return

    const firstBlock = editor.document[0]
    if (firstBlock?.type !== 'heading') return

    try {
      editor.setTextCursorPosition(firstBlock.id, 'end')
    } catch {
      return
    }
    editor.focus()
  })

  return true
}

function useEditorContainerClickHandler(options: {
  editable: boolean
  editor: ReturnType<typeof useCreateBlockNote>
}) {
  const { editable, editor } = options

  return useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!editable) return
    const target = e.target as HTMLElement
    if (queueTitleHeadingCursorRepair(target, editor)) return
    if (shouldIgnoreContainerClick(target)) return
    const blocks = editor.document
    if (blocks.length > 0) {
      const targetBlock = findNearestTextCursorBlock(blocks, blocks.length - 1)
      if (targetBlock) {
        try {
          editor.setTextCursorPosition(targetBlock.id, 'end')
        } catch {
          // Ignore transient BlockNote selection errors and at least restore focus.
        }
      }
    }
    editor.focus()
  }, [editor, editable])
}

function useCompositionAwareEditorChange(options: {
  containerRef: React.RefObject<HTMLDivElement | null>
  onChange?: () => void
}) {
  const { containerRef, onChange } = options
  const onChangeRef = useRef(onChange)
  const composingRef = useRef(false)
  const pendingChangeRef = useRef(false)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const flushPendingChange = () => {
      if (composingRef.current || !pendingChangeRef.current) return
      pendingChangeRef.current = false
      onChangeRef.current?.()
    }

    const handleCompositionStart = () => {
      composingRef.current = true
    }

    const handleCompositionEnd = () => {
      composingRef.current = false
      queueMicrotask(flushPendingChange)
    }

    container.addEventListener('compositionstart', handleCompositionStart, true)
    container.addEventListener('compositionend', handleCompositionEnd, true)
    return () => {
      container.removeEventListener('compositionstart', handleCompositionStart, true)
      container.removeEventListener('compositionend', handleCompositionEnd, true)
    }
  }, [containerRef])

  return useCallback(() => {
    if (composingRef.current) {
      pendingChangeRef.current = true
      return
    }

    pendingChangeRef.current = false
    onChangeRef.current?.()
  }, [])
}

/** Insert an image block after the current cursor position. */
function useInsertImageCallback(editor: ReturnType<typeof useCreateBlockNote>) {
  const editorRef = useRef(editor)
  useEffect(() => { editorRef.current = editor }, [editor])
  return useCallback((url: string) => {
    const e = editorRef.current
    const cursorBlock = e.getTextCursorPosition().block
    e.insertBlocks([{ type: 'image' as const, props: { url } }], cursorBlock, 'after')
  }, [])
}

/** Single BlockNote editor view — content is swapped via replaceBlocks */
export function SingleEditorView({ editor, entries, onNavigateWikilink, onChange, onCreateAndOpenNote, vaultPath, editable = true }: {
  editor: ReturnType<typeof useCreateBlockNote>
  entries: VaultEntry[]
  onNavigateWikilink: (target: string) => void
  onChange?: () => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  vaultPath?: string
  editable?: boolean
}) {
  const { cssVars } = useEditorTheme()
  const themeMode = useDocumentThemeMode()
  const containerRef = useRef<HTMLDivElement>(null)
  const handleContainerClick = useEditorContainerClickHandler({ editable, editor })
  const handleEditorChange = useCompositionAwareEditorChange({ containerRef, onChange })
  const onImageUrl = useInsertImageCallback(editor)
  const { isDragOver } = useImageDrop({ containerRef, onImageUrl, vaultPath })
  useBlockNoteSideMenuHoverGuard(containerRef)
  useEditorLinkActivation(containerRef, onNavigateWikilink)

  useEffect(() => {
    _wikilinkEntriesRef.current = entries
  }, [entries])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    return observeNativeTextAssistanceDisabled(container)
  }, [])

  useSeedBlockNoteTableBridge(editor)

  const {
    getWikilinkItems,
    getPersonMentionItems,
    getTagCollectionItems,
    getSlashMenuItems,
    insertWikilink,
  } = useSingleEditorSuggestionItems({
    editor,
    entries,
    onCreateAndOpenNote,
    vaultPath,
  })
  useNoteWikilinkDrop({ containerRef, onInsertTarget: insertWikilink, vaultPath })

  return (
    <div ref={containerRef} className={`editor__blocknote-container${isDragOver ? ' editor__blocknote-container--drag-over' : ''}`} style={cssVars as React.CSSProperties} onClick={handleContainerClick}>
      {isDragOver && (
        <div className="editor__drop-overlay">
          <div className="editor__drop-overlay-label">Drop image here</div>
        </div>
      )}
      <SharedContextBlockNoteView
        editor={editor}
        theme={themeMode}
        onChange={handleEditorChange}
        editable={editable}
        formattingToolbar={false}
        linkToolbar={false}
        slashMenu={false}
        sideMenu={false}
      >
        <SideMenuController sideMenu={GrimoireSideMenu} />
        <GrimoireFormattingToolbarController
          formattingToolbar={GrimoireFormattingToolbar}
          floatingUIOptions={{
            elementProps: {
              onMouseDownCapture: handleToolbarMouseDownCapture,
            },
          }}
        />
        <LinkToolbarController
          linkToolbar={GrimoireLinkToolbar}
          floatingUIOptions={{
            elementProps: {
              onMouseDownCapture: handleToolbarMouseDownCapture,
            },
          }}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={getSlashMenuItems}
        />
        <SuggestionMenuController
          triggerCharacter="[["
          getItems={getWikilinkItems}
          suggestionMenuComponent={WikilinkSuggestionMenu}
          onItemClick={(item: WikilinkSuggestionItem) => item.onItemClick()}
        />
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={getPersonMentionItems}
          suggestionMenuComponent={WikilinkSuggestionMenu}
          onItemClick={(item: WikilinkSuggestionItem) => item.onItemClick()}
        />
        <SuggestionMenuController
          triggerCharacter="#"
          getItems={getTagCollectionItems}
          suggestionMenuComponent={WikilinkSuggestionMenu}
          onItemClick={(item: WikilinkSuggestionItem) => item.onItemClick()}
        />
      </SharedContextBlockNoteView>
    </div>
  )
}
