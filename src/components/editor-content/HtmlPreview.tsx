import { useMemo } from 'react'
import { buildHtmlPreviewDocument } from '../../utils/htmlPreview'

interface HtmlPreviewProps {
  content: string
  title: string
}

/** Renders vault HTML in a sandboxed iframe instead of exposing raw tags. */
export function HtmlPreview({ content, title }: HtmlPreviewProps) {
  const srcDoc = useMemo(() => buildHtmlPreviewDocument(content), [content])

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden bg-[var(--surface-editor)] p-6">
      <iframe
        className="h-full w-full rounded-md border border-border bg-white shadow-sm"
        data-testid="html-preview"
        sandbox=""
        srcDoc={srcDoc}
        title={`HTML preview: ${title}`}
      />
    </div>
  )
}
