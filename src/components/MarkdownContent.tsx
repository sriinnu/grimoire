import { lazy, memo, Suspense, useMemo, useCallback, type MouseEvent } from 'react'
import Markdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { preprocessWikilinks, WIKILINK_SCHEME } from '../utils/chatWikilinks'
import { resolveImageUrls } from '../utils/vaultImages'

const REMARK_PLUGINS = [remarkGfm]
const MarkdownContentRich = lazy(async () => ({
  default: (await import('./MarkdownContentRich')).MarkdownContentRich,
}))

function wikilinkUrlTransform(url: string): string {
  if (url.startsWith(WIKILINK_SCHEME)) return url
  return defaultUrlTransform(url)
}

interface MarkdownContentProps {
  content: string
  vaultPath?: string
  onWikilinkClick?: (target: string) => void
}

function hasRichMarkdownBlock(content: string): boolean {
  return /(?:^|\n) {0,3}(?:```|~~~)/u.test(content)
}

export const MarkdownContent = memo(function MarkdownContent({ content, vaultPath, onWikilinkClick }: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    const linkedContent = onWikilinkClick ? preprocessWikilinks(content) : content
    return vaultPath ? resolveImageUrls(linkedContent, vaultPath) : linkedContent
  }, [content, onWikilinkClick, vaultPath])
  const needsRichRenderer = hasRichMarkdownBlock(processedContent)

  if (needsRichRenderer) {
    return (
      <Suspense fallback={<MarkdownContentPlain content={processedContent} onWikilinkClick={onWikilinkClick} />}>
        <MarkdownContentRich content={processedContent} onWikilinkClick={onWikilinkClick} />
      </Suspense>
    )
  }

  return <MarkdownContentPlain content={processedContent} onWikilinkClick={onWikilinkClick} />
})

function MarkdownContentPlain({ content, onWikilinkClick }: Pick<MarkdownContentProps, 'content' | 'onWikilinkClick'>) {
  const handleClick = useCallback((e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-wikilink-target]')
    if (el) {
      e.preventDefault()
      onWikilinkClick?.(el.dataset.wikilinkTarget!)
    }
  }, [onWikilinkClick])

  const components = useMemo<Components>(() => ({
    a: ({ href, children }) => {
      if (href?.startsWith(WIKILINK_SCHEME)) {
        const target = decodeURIComponent(href.slice(WIKILINK_SCHEME.length))
        return (
          <span className="chat-wikilink" data-wikilink-target={target} role="link" tabIndex={0}>
            {children}
          </span>
        )
      }
      return <a href={href}>{children}</a>
    },
    img: ({ alt, src, title }) => (
      <img alt={alt ?? ''} draggable={false} loading="lazy" src={src} title={title} />
    ),
  }), [])

  return (
    <div className="ai-markdown" onClick={onWikilinkClick ? handleClick : undefined} role="presentation">
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        components={components}
        urlTransform={onWikilinkClick ? wikilinkUrlTransform : undefined}
      >
        {content}
      </Markdown>
    </div>
  )
}
