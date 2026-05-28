import { describe, expect, it } from 'vitest'
import { buildHtmlPreviewDocument, isRenderableHtmlEntry } from './htmlPreview'

describe('htmlPreview', () => {
  it('detects html files and standalone html content', () => {
    expect(isRenderableHtmlEntry({ fileKind: 'text', filename: 'page.html', path: '/vault/page.html' }, 'plain')).toBe(true)
    expect(isRenderableHtmlEntry({ fileKind: 'markdown', filename: 'note.md', path: '/vault/note.md' }, '<section><h1>Hi</h1></section>')).toBe(true)
    expect(isRenderableHtmlEntry({ fileKind: 'markdown', filename: 'note.md', path: '/vault/note.md' }, 'Paragraph with <span>inline</span> html')).toBe(false)
  })

  it('removes executable html from preview documents', () => {
    const documentHtml = buildHtmlPreviewDocument('<h1 onclick="evil()">Hi</h1><script>evil()</script><a href="javascript:evil()">Bad</a>')

    expect(documentHtml).toContain('<h1>Hi</h1>')
    expect(documentHtml).not.toContain('<script')
    expect(documentHtml).not.toContain('onclick')
    expect(documentHtml).not.toContain('javascript:')
  })

  it('uses theme-driven preview styling without hard-coded browser chrome colors', () => {
    const documentHtml = buildHtmlPreviewDocument('<table><tr><td>Cell</td></tr></table>', {
      background: '#101820',
      border: '#24465a',
      colorScheme: 'dark',
      foreground: '#f7fbff',
      fontFamily: 'ui-serif, Georgia, serif',
      link: '#8be1ff',
      muted: '#a6b7c2',
    })

    expect(documentHtml).toContain('--html-preview-bg:#101820')
    expect(documentHtml).toContain('td,th{border:1px solid var(--html-preview-border)')
    expect(documentHtml).not.toContain('#d6d6d6')
  })

  it('drops unsafe css values before writing the preview style tag', () => {
    const documentHtml = buildHtmlPreviewDocument('<p>Safe</p>', {
      background: '#101820};</style><script>evil()</script>',
      border: 'url(https://example.test/x)',
      colorScheme: 'bad-scheme',
      foreground: '#f7fbff',
      fontFamily: 'ui-serif, Georgia, serif',
      link: '#8be1ff',
      muted: '#a6b7c2',
    })

    expect(documentHtml).toContain('--html-preview-bg:Canvas')
    expect(documentHtml).toContain('--html-preview-border:color-mix(in srgb, CanvasText 22%, transparent)')
    expect(documentHtml).toContain('color-scheme:light dark')
    expect(documentHtml).not.toContain('evil()')
    expect(documentHtml).not.toContain('url(https://example.test/x)')
  })
})
