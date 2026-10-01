import { describe, expect, it } from 'vitest'
import { renderFrontmatterList, renderNoteBody, renderNoteHtml, stripFrontmatter } from './renderNoteHtml'

const note = `---
type: Project
status: Active
tags: [a, b]
empty:
---

# Heading

Plain text with **bold**, a [[Wiki Page]] link and an [outside link](https://example.com).

| a | b |
| - | - |
| 1 | 2 |

\`\`\`ts
const x = "<script>"
\`\`\`
`

describe('stripFrontmatter', () => {
  it('drops the leading block only', () => {
    expect(stripFrontmatter(note).startsWith('\n# Heading')).toBe(true)
    expect(stripFrontmatter('no frontmatter\n---\nnot a block')).toBe('no frontmatter\n---\nnot a block')
  })
})

describe('renderFrontmatterList', () => {
  it('renders a definition list, escaped, without empty values', () => {
    const html = renderFrontmatterList(note)
    expect(html).toContain('<dt>type</dt><dd>Project</dd>')
    expect(html).toContain('<dd>a, b</dd>')
    expect(html).not.toContain('<dt>empty</dt>')
    expect(renderFrontmatterList('# no frontmatter')).toBe('')
  })
})

describe('renderNoteBody', () => {
  it('renders GFM and turns wikilinks into plain spans with their target', () => {
    const html = renderNoteBody(note)
    expect(html).toContain('<h1>Heading</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<span class="wikilink" data-wikilink="Wiki Page">Wiki Page</span>')
    expect(html).toContain('<a href="https://example.com">outside link</a>')
    expect(html).toContain('<table>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
  })
})

describe('renderNoteHtml', () => {
  it('is a standalone document with no external assets', () => {
    const html = renderNoteHtml({ title: 'A <b>title</b>', content: note })
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<title>A &lt;b&gt;title&lt;/b&gt;</title>')
    expect(html).toContain('<h1>A &lt;b&gt;title&lt;/b&gt;</h1>')
    expect(html).toContain('max-width: 70ch')
    expect(html).not.toMatch(/<link\s/)
    expect(html).not.toMatch(/<script\s/)
    expect(html).not.toMatch(/src="http/)
  })
})
