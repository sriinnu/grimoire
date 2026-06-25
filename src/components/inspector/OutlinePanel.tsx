import { Check, FileText, PencilLine } from 'lucide-react'
import { Glyph } from '@/components/glyphs/Glyph'
import {
  upsertMarkdownToc,
  type MarkdownDocumentSemantics,
  type MarkdownHeading,
} from '@grimoire/markdown-editor'
import { useState } from 'react'
import { Button } from '../ui/button'
import { scrollToNoteHeading } from '../../utils/noteNavigation'

interface OutlinePanelProps {
  semantics: MarkdownDocumentSemantics
  path: string
  content: string
  onToggleRawEditor?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
}

function headingIndent(level: number): string {
  return `${Math.max(0, level - 1) * 10}px`
}

function OutlineHeading({
  heading,
  headingIndex,
  headings,
}: {
  heading: MarkdownHeading
  headingIndex: number
  headings: MarkdownHeading[]
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full justify-start rounded-md px-1.5 py-1 text-[12px] text-muted-foreground hover:text-foreground"
      style={{ paddingLeft: headingIndent(heading.level) }}
      title={`Line ${heading.line}`}
      aria-label={`Jump to H${heading.level} ${heading.text}`}
      onClick={() => scrollToNoteHeading(heading, headingIndex, headings)}
    >
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">H{heading.level}</span>
      <span className="min-w-0 flex-1 truncate text-foreground">{heading.text}</span>
    </Button>
  )
}

/** Right-sidebar document outline derived from shared Markdown semantics. */
export function OutlinePanel({
  semantics,
  path,
  content,
  onToggleRawEditor,
  onReplaceContent,
}: OutlinePanelProps) {
  const [formatStatus, setFormatStatus] = useState<string | null>(null)
  const hasHeadings = semantics.headings.length > 0
  const frontmatterLabel = semantics.frontmatterState === 'valid'
    ? `${semantics.frontmatterFields.length} fields`
    : semantics.frontmatterState

  async function insertToc() {
    const result = upsertMarkdownToc(content)
    if (result.error) {
      setFormatStatus(result.error)
      return
    }
    await onReplaceContent?.(path, result.markdown)
    setFormatStatus(result.changed ? 'TOC updated.' : 'TOC already clean.')
    window.setTimeout(() => setFormatStatus(null), 1600)
  }

  return (
    <section className="inspector-card">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          <Glyph name="list" size={12} className="size-3" />
          Outline
        </h4>
        {onToggleRawEditor && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Insert or update Markdown TOC"
              aria-label="Insert or update Markdown TOC"
              disabled={!onReplaceContent}
              onClick={() => void insertToc()}
            >
              <Glyph name="list" size={12} className="size-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              title="Edit raw Markdown and YAML"
              aria-label="Edit raw Markdown and YAML"
              onClick={onToggleRawEditor}
            >
              <PencilLine className="size-3" />
            </Button>
          </div>
        )}
      </div>
      <div className="mb-2 flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
        <FileText className="size-3" />
        <span className="truncate">YAML: {frontmatterLabel}</span>
        <span className="ml-auto shrink-0">{semantics.headings.length} headings</span>
      </div>
      {formatStatus && (
        <div className="mb-2 flex items-center gap-1 rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
          <Check className="size-3" />
          <span className="truncate">{formatStatus}</span>
        </div>
      )}
      {hasHeadings ? (
        <div className="flex flex-col gap-0.5">
          {semantics.headings.map((heading, index) => (
            <OutlineHeading
              key={`${heading.slug}:${heading.line}`}
              heading={heading}
              headingIndex={index}
              headings={semantics.headings}
            />
          ))}
        </div>
      ) : (
        <p className="m-0 rounded-md bg-muted/40 px-2 py-2 text-[12px] text-muted-foreground">
          No headings yet.
        </p>
      )}
    </section>
  )
}
