import { Glyph } from './glyphs/Glyph'
import { Button } from './ui/button'
import { EditorNavigatorControls } from './EditorNavigatorControls'

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
  return (
    <div className="editor-agent-composer-wrap grimoire-control-entrance">
      <div className="editor-agent-composer" role="group" aria-label="Editor note tools">
        <Button
          type="button"
          variant="ghost"
          className="editor-agent-composer__prompt"
          disabled={disabled || !onOpen}
          onClick={onOpen}
          aria-label="Ask Grimoire about this note"
        >
          <Glyph name="sparkle" className="editor-agent-composer__mark" />
          <span className="editor-agent-composer__placeholder">Ask Grimoire anything...</span>
        </Button>
        <EditorNavigatorControls content={content} variant="composer" />
      </div>
    </div>
  )
}
