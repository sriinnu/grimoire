import { useEffect, useMemo, useState } from 'react'
import { buildHtmlPreviewDocument, DEFAULT_HTML_PREVIEW_THEME, type HtmlPreviewTheme } from '../../utils/htmlPreview'

interface HtmlPreviewProps {
  content: string
  title: string
}

function readCssVariable(style: CSSStyleDeclaration, name: string, fallback: string): string {
  return style.getPropertyValue(name).trim() || fallback
}

function readHtmlPreviewTheme(): HtmlPreviewTheme {
  if (typeof window === 'undefined') return DEFAULT_HTML_PREVIEW_THEME

  const root = document.documentElement
  const style = window.getComputedStyle(root)
  return {
    background: readCssVariable(style, '--surface-card', DEFAULT_HTML_PREVIEW_THEME.background),
    border: readCssVariable(style, '--border-default', DEFAULT_HTML_PREVIEW_THEME.border),
    colorScheme: style.colorScheme || DEFAULT_HTML_PREVIEW_THEME.colorScheme,
    foreground: readCssVariable(style, '--text-primary', DEFAULT_HTML_PREVIEW_THEME.foreground),
    fontFamily: readCssVariable(style, '--grimoire-editor-font-family', DEFAULT_HTML_PREVIEW_THEME.fontFamily),
    link: readCssVariable(style, '--primary', DEFAULT_HTML_PREVIEW_THEME.link),
    muted: readCssVariable(style, '--text-secondary', DEFAULT_HTML_PREVIEW_THEME.muted),
  }
}

function samePreviewTheme(left: HtmlPreviewTheme, right: HtmlPreviewTheme): boolean {
  return Object.keys(DEFAULT_HTML_PREVIEW_THEME).every((key) => left[key as keyof HtmlPreviewTheme] === right[key as keyof HtmlPreviewTheme])
}

function useHtmlPreviewTheme(): HtmlPreviewTheme {
  const [theme, setTheme] = useState(readHtmlPreviewTheme)

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => {
      const nextTheme = readHtmlPreviewTheme()
      setTheme((currentTheme) => (samePreviewTheme(currentTheme, nextTheme) ? currentTheme : nextTheme))
    }

    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'data-editor-font', 'data-theme', 'data-theme-preset', 'style'] })
    return () => observer.disconnect()
  }, [])

  return theme
}

/** Renders vault HTML in a sandboxed iframe instead of exposing raw tags. */
export function HtmlPreview({ content, title }: HtmlPreviewProps) {
  const theme = useHtmlPreviewTheme()
  const srcDoc = useMemo(() => buildHtmlPreviewDocument(content, theme), [content, theme])

  return (
    <div className="html-preview-shell flex flex-1 min-h-0 overflow-hidden">
      <iframe
        className="html-preview-frame h-full w-full rounded-md border"
        data-testid="html-preview"
        sandbox=""
        srcDoc={srcDoc}
        title={`HTML preview: ${title}`}
      />
    </div>
  )
}
