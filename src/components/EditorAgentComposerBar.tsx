import { useState } from 'react'
import { ListTree, Search, Sparkles } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'
import { EditorNavigatorPopover, type EditorNavigatorMode } from './EditorNavigatorPopover'

/** Editor-level prompt launcher for the local Grimoire agent. */
export function EditorAgentComposerBar({
  content = '',
  disabled,
  onOpen,
}: {
  content?: string
  disabled?: boolean
  onOpen?: () => void
}) {
  const [navigatorOpen, setNavigatorOpen] = useState(false)
  const [navigatorMode, setNavigatorMode] = useState<EditorNavigatorMode>('search')

  function openNavigator(mode: EditorNavigatorMode) {
    setNavigatorMode(mode)
    setNavigatorOpen(true)
  }

  return (
    <Popover open={navigatorOpen} onOpenChange={setNavigatorOpen}>
      <PopoverAnchor asChild>
        <div className="editor-agent-composer-wrap">
          <div className="editor-agent-composer" role="group" aria-label="Editor note tools">
            <Button
              type="button"
              variant="ghost"
              className="editor-agent-composer__prompt"
              disabled={disabled || !onOpen}
              onClick={onOpen}
              aria-label="Ask Grimoire about this note"
            >
              <Sparkles className="editor-agent-composer__mark" />
              <span className="editor-agent-composer__placeholder">Ask Grimoire anything...</span>
            </Button>
            <div className="editor-agent-composer__tools">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="editor-agent-composer__tool"
                title="Search this note"
                aria-label="Search this note"
                onClick={() => openNavigator('search')}
              >
                <Search className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="editor-agent-composer__tool"
                title="Table of contents"
                aria-label="Table of contents"
                onClick={() => openNavigator('toc')}
              >
                <ListTree className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent className="editor-navigator-popover-shell" align="center" side="top" sideOffset={10}>
        <EditorNavigatorPopover content={content} mode={navigatorMode} onModeChange={setNavigatorMode} />
      </PopoverContent>
    </Popover>
  )
}
