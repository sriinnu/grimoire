import { isValidElement, memo, useMemo, useCallback, type MouseEvent, type ReactNode } from 'react'
import Markdown, { defaultUrlTransform, type Components, type Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { WIKILINK_SCHEME } from '../utils/chatWikilinks'
import { detectCodeLanguage } from '../utils/codeLanguageDetection'
import { MarkdownCodeBlock } from './MarkdownCodeBlock'
import { MermaidDiagram } from './MermaidDiagram'

const REMARK_PLUGINS = [remarkGfm]
const REHYPE_PLUGINS: Options['rehypePlugins'] = [[rehypeHighlight, { detect: true, ignoreMissing: true }]]

interface MarkdownContentRichProps {
  content: string
  onWikilinkClick?: (target: string) => void
}

function wikilinkUrlTransform(url: string): string {
  if (url.startsWith(WIKILINK_SCHEME)) return url
  return defaultUrlTransform(url)
}

function isMermaidDiagramElement(children: ReactNode): boolean {
  return isValidElement(children) && children.type === MermaidDiagram
}

function getCodeFenceLanguage(className?: string): string | null {
  const languageClass = className?.split(/\s+/u).find((token) => token.startsWith('language-'))
  return languageClass?.slice('language-'.length).toLowerCase() ?? null
}

function codeText(children: ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(codeText).join('')
  if (isValidElement(children)) return codeText((children.props as { children?: ReactNode }).children)
  return ''
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

/** Renders fenced-code AI Markdown with syntax highlighting and Mermaid support. */
export const MarkdownContentRich = memo(function MarkdownContentRich({ content, onWikilinkClick }: MarkdownContentRichProps) {
  const handleClick = useCallback((e: MouseEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-wikilink-target]')
    if (el) {
      e.preventDefault()
      onWikilinkClick?.(el.dataset.wikilinkTarget!)
    }
  }, [onWikilinkClick])

  const components = useMemo<Components>(() => ({
    pre: ({ children }) => {
      if (isMermaidDiagramElement(children)) return <>{children}</>
      if (!isValidElement(children)) return <pre>{children}</pre>
      const codeProps = children.props as { children?: ReactNode; className?: string }
      const source = codeText(codeProps.children).replace(/\n$/u, '')
      return (
        <MarkdownCodeBlock
          language={getCodeFenceLanguage(codeProps.className)}
          source={source}
        >
          {children}
        </MarkdownCodeBlock>
      )
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
  }), [])

  return (
    <div className="ai-markdown" onClick={onWikilinkClick ? handleClick : undefined} role="presentation">
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
        urlTransform={onWikilinkClick ? wikilinkUrlTransform : undefined}
      >
        {content}
      </Markdown>
    </div>
  )
})
