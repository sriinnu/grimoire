import { Glyph } from './glyphs/Glyph'
import { Button } from './ui/button'

/** Editor-level prompt launcher for the local Grimoire agent. Find/TOC/Links
 *  live once, in the meta strip above the note — not repeated down here. */
export function EditorAgentComposerBar({
  disabled,
  onOpen,
}: {
  disabled?: boolean
  onOpen?: () => void
}) {
  return (
    <div className="editor-agent-composer-wrap grimoire-control-entrance">
      <div className="editor-agent-composer" role="group" aria-label="Ask about this note">
        <Button
          type="button"
          variant="ghost"
          className="editor-agent-composer__prompt"
          disabled={disabled || !onOpen}
          onClick={onOpen}
          aria-label="Ask Grimoire about this note"
        >
          <Glyph name="sparkle" className="editor-agent-composer__mark" data-icon-intent="ai" />
          <span className="editor-agent-composer__placeholder">Ask Grimoire anything...</span>
        </Button>
      </div>
    </div>
  )
}
