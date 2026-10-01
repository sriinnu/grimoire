import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { parseFrontmatter } from '../../utils/frontmatter'
import { preprocessWikilinks, WIKILINK_SCHEME } from '../../utils/chatWikilinks'

export interface NoteExportInput {
  title: string
  content: string
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** The body without its frontmatter block. */
export function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER, '')
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Frontmatter as a small definition list; empty values are left out. */
export function renderFrontmatterList(content: string): string {
  const entries = Object.entries(parseFrontmatter(content)).filter(([, value]) => formatValue(value).trim().length > 0)
  if (entries.length === 0) return ''
  const rows = entries
    .map(([key, value]) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(formatValue(value))}</dd></div>`)
    .join('')
  return `<dl class="properties">${rows}</dl>`
}

/**
 * The body as HTML through the same react-markdown + GFM pipeline the app
 * renders with. Wikilinks come out as plain spans carrying their target;
 * an exported page has no vault to resolve them against.
 */
export function renderNoteBody(content: string): string {
  const markdown = preprocessWikilinks(stripFrontmatter(content))
  const html = renderToStaticMarkup(
    createElement(Markdown, {
      remarkPlugins: [remarkGfm],
      urlTransform: (url: string) => url,
      components: {
        a: ({ href, children }) => {
          if (typeof href === 'string' && href.startsWith(WIKILINK_SCHEME)) {
            const target = decodeURIComponent(href.slice(WIKILINK_SCHEME.length))
            return createElement('span', { className: 'wikilink', 'data-wikilink': target }, children)
          }
          return createElement('a', { href }, children)
        },
      },
    }, markdown),
  )
  return html
}

const STYLES = `
  :root { color-scheme: light dark; }
  body { margin: 0; padding: 3rem 1.25rem 5rem; background: #fbf8f2; color: #2a2620; font: 17px/1.6 Georgia, "Iowan Old Style", "Palatino Linotype", serif; }
  @media (prefers-color-scheme: dark) { body { background: #1c1a17; color: #e8e2d6; } a { color: #9aa8ff; } .properties, blockquote, pre { border-color: #3a362f; } }
  main { max-width: 70ch; margin: 0 auto; }
  h1 { font-size: 2rem; line-height: 1.2; margin: 0 0 1rem; }
  h2, h3, h4 { line-height: 1.25; margin: 2rem 0 0.5rem; }
  p, ul, ol, blockquote, pre, table { margin: 0 0 1rem; }
  a { color: #3a4ba8; }
  .wikilink { border-bottom: 1px dotted currentColor; }
  .properties { display: grid; grid-template-columns: max-content 1fr; gap: 0.25rem 1rem; margin: 0 0 2rem; padding: 0.75rem 0; border-top: 1px solid #e3ddd2; border-bottom: 1px solid #e3ddd2; font-size: 0.9rem; }
  .properties div { display: contents; }
  .properties dt { opacity: 0.6; }
  .properties dd { margin: 0; }
  blockquote { padding-left: 1rem; border-left: 2px solid #e3ddd2; opacity: 0.85; }
  pre { padding: 0.75rem 1rem; border: 1px solid #e3ddd2; border-radius: 6px; overflow-x: auto; font-size: 0.85em; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  table { border-collapse: collapse; width: 100%; font-size: 0.95em; }
  th, td { padding: 0.4rem 0.6rem; border-bottom: 1px solid #e3ddd2; text-align: left; vertical-align: top; }
  img { max-width: 100%; height: auto; }
  @media print { body { padding: 0; background: white; color: black; } main { max-width: none; } }
`

/** A standalone HTML document: title, properties, body, inline styles, no external assets. */
export function renderNoteHtml({ title, content }: NoteExportInput): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>${STYLES}</style>`,
    '</head>',
    '<body>',
    '<main>',
    `<h1>${escapeHtml(title)}</h1>`,
    renderFrontmatterList(content),
    renderNoteBody(content),
    '</main>',
    '</body>',
    '</html>',
    '',
  ].join('\n')
}
