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
})
