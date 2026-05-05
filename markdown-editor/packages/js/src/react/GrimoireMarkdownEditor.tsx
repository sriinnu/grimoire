import { useCallback, useEffect, useRef } from 'react'
import { BlockNoteView } from '@blocknote/mantine'
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react'
import type { ComponentProps } from 'react'
import type { GrimoireSlashMenuEditor } from './grimoireSlashCommandActions'
import { getGrimoireSlashMenuItems } from './grimoireEditorFormattingConfig'

type BlockNoteViewTheme = ComponentProps<typeof BlockNoteView>['theme']

export interface GrimoireMarkdownEditorProps {
  initialMarkdown?: string
  editable?: boolean
  theme?: BlockNoteViewTheme
  className?: string
  onMarkdownChange?: (markdown: string) => void
}

async function parseInitialMarkdown(
  editor: ReturnType<typeof useCreateBlockNote>,
  markdown: string,
) {
  const parsed = editor.tryParseMarkdownToBlocks(markdown)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- BlockNote may return sync or async parser results.
  if (parsed && typeof (parsed as any).then === 'function') {
    return parsed as ReturnType<typeof editor.tryParseMarkdownToBlocks>
  }
  return parsed
}

/**
 * Standalone BlockNote editor surface with Grimoire's package-owned slash menu.
 */
export function GrimoireMarkdownEditor(props: GrimoireMarkdownEditorProps) {
  const {
    initialMarkdown = '# Untitled\n\nType / for commands.',
    editable = true,
    theme = 'light',
    className,
    onMarkdownChange,
  } = props
  const editor = useCreateBlockNote()
  const didLoadInitialMarkdownRef = useRef(false)

  useEffect(() => {
    if (didLoadInitialMarkdownRef.current) return
    didLoadInitialMarkdownRef.current = true

    void parseInitialMarkdown(editor, initialMarkdown)
      .then((blocks) => {
        if (!blocks || blocks.length === 0) return
        editor.replaceBlocks(editor.document, blocks)
      })
      .catch((error: unknown) => {
        console.warn('[markdown-editor] Failed to parse initial markdown:', error)
      })
  }, [editor, initialMarkdown])

  const handleChange = useCallback(() => {
    if (!onMarkdownChange) return
    onMarkdownChange(editor.blocksToMarkdownLossy(editor.document))
  }, [editor, onMarkdownChange])

  return (
    <BlockNoteView
      className={className}
      editable={editable}
      editor={editor}
      onChange={handleChange}
      slashMenu={false}
      theme={theme}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async query => getGrimoireSlashMenuItems(editor as unknown as GrimoireSlashMenuEditor, query)}
      />
    </BlockNoteView>
  )
}
