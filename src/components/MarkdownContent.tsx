import { isValidElement, memo, useMemo, useCallback, type MouseEvent, type ReactNode } from 'react'
import Markdown, { defaultUrlTransform, type Components, type Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { preprocessWikilinks, WIKILINK_SCHEME } from '../utils/chatWikilinks'
import { detectCodeLanguage } from '../utils/codeLanguageDetection'
import { resolveImageUrls } from '../utils/vaultImages'
import { MermaidDiagram } from './MermaidDiagram'

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS: Options['rehypePlugins'] = [[rehypeHighlight, { detect: true, ignoreMissing: true }]]

function wikilinkUrlTransform(url: string): string {
  if (url.startsWith(WIKILINK_SCHEME)) return url
  return defaultUrlTransform(url)
}

interface MarkdownContentProps {
  content: string
  vaultPath?: string
  onWikilinkClick?: (target: string) => void
}

function isMermaidDiagramElement(children: ReactNode): boolean {
  return isValidElement(children) && children.type === MermaidDiagram
}

function getCodeFenceLanguage(className?: string): string | null {
  const languageClass = className?.split(/\s+/u).find((token) => token.startsWith('language-'))
  return languageClass?.slice('language-'.length).toLowerCase() ?? null
}

function resolveMermaidChart(className: string | undefined, code: string): string | null {
  const language = getCodeFenceLanguage(className)
  if (language === 'mermaid') return code

  if (language === 'classdiagram' || language === 'classdiagrams') {
    return /^\s*classDiagram(?:-v2)?\b/u.test(code) ? code : `classDiagram\n${code}`
  }

  if (language === 'classdiagram-v2' || language === 'classdiagramv2') {
    return /^\s*classDiagram-v2\b/u.test(code) ? code : `classDiagram-v2\n${code}`
  }

  if (code.includes('\n') && detectCodeLanguage(code) === 'mermaid') return code
  return null
}

export const MarkdownContent = memo(function MarkdownContent({ content, vaultPath, onWikilinkClick }: MarkdownContentProps) {
  const processedContent = useMemo(() => {
    const linkedContent = onWikilinkClick ? preprocessWikilinks(content) : content
    return vaultPath ? resolveImageUrls(linkedContent, vaultPath) : linkedContent
  }, [content, onWikilinkClick, vaultPath])

  const handleClick = useCallback((e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-wikilink-target]')
    if (el) {
      e.preventDefault()
      onWikilinkClick?.(el.dataset.wikilinkTarget!)
    }
  }, [onWikilinkClick])

  const components = useMemo<Components>(() => {
    return {
      pre: ({ children }) => {
        if (isMermaidDiagramElement(children)) return <>{children}</>
        return <pre>{children}</pre>
      },
      code: ({ className, children }) => {
        const code = String(children).replace(/\n$/u, '')
        const mermaidChart = resolveMermaidChart(className, code)
        if (mermaidChart) return <MermaidDiagram chart={mermaidChart} />
        return <code className={className}>{children}</code>
      },
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
    }
  }, [])

  return (
    <div className="ai-markdown" onClick={onWikilinkClick ? handleClick : undefined} role="presentation">
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
        urlTransform={onWikilinkClick ? wikilinkUrlTransform : undefined}
      >
        {processedContent}
      </Markdown>
    </div>
  )
})
