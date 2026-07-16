import { useCallback, useState, type ReactNode } from 'react'
import { Check, Copy, Maximize2, Minimize2, WrapText } from 'lucide-react'

interface MarkdownCodeBlockProps {
  children: ReactNode
  language: string | null
  source: string
}

const COMPACT_LINE_LIMIT = 8

/**
 * A code lens, rather than a generic terminal-shaped card.
 *
 * Code opens in a readable, wrapped glimpse. The reader can reveal the rest or
 * switch to exact, unwrapped source without turning every fence into a giant
 * scrolling rectangle.
 */
export function MarkdownCodeBlock({ children, language, source }: MarkdownCodeBlockProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const lineCount = Math.max(1, source.split('\n').length)
  const hasHiddenLines = lineCount > COMPACT_LINE_LIMIT
  const [expanded, setExpanded] = useState(!hasHiddenLines)
  const [wrapped, setWrapped] = useState(true)
  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(source)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 1600)
    } catch {
      setCopyState('failed')
    }
  }, [source])

  const copyLabel = copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy code'

  const revealedLabel = expanded ? 'Collapse code' : `Show ${lineCount - COMPACT_LINE_LIMIT} more ${lineCount - COMPACT_LINE_LIMIT === 1 ? 'line' : 'lines'}`

  return (
    <section className={`ai-code-fence ${expanded ? 'is-expanded' : 'is-glimpsed'} ${wrapped ? 'is-wrapped' : 'is-exact'}`} data-testid="markdown-code-fence">
      <header className="ai-code-fence__toolbar">
        <div className="ai-code-fence__identity">
          <span className="ai-code-fence__language">{language || 'code'}</span>
          <span aria-hidden="true" className="ai-code-fence__divider" />
          <span className="ai-code-fence__line-count">{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
        </div>
        <div className="ai-code-fence__actions">
          <button
            aria-label={wrapped ? 'Show exact code without wrapping' : 'Wrap code for reading'}
            aria-pressed={!wrapped}
            className="ai-code-fence__action"
            onClick={() => setWrapped((current) => !current)}
            type="button"
          >
            <WrapText size={14} />
            <span>{wrapped ? 'Exact' : 'Wrap'}</span>
          </button>
          <button aria-label={copyLabel} className="ai-code-fence__action" onClick={() => void copyCode()} type="button">
            {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            <span>{copyState === 'copied' ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </header>
      <div className="ai-code-fence__viewport">
        <pre>{children}</pre>
      </div>
      {hasHiddenLines && (
        <footer className="ai-code-fence__reveal">
          <button aria-expanded={expanded} className="ai-code-fence__reveal-button" onClick={() => setExpanded((current) => !current)} type="button">
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{revealedLabel}</span>
          </button>
        </footer>
      )}
    </section>
  )
}
