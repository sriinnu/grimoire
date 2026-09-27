import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/print.css`, 'utf8')
const printBlock = css.slice(css.indexOf('@media print'))

describe('print.css', () => {
  it('only applies when printing', () => {
    expect(css.trimStart().replace(/^\/\*[\s\S]*?\*\/\s*/, '').startsWith('@media print')).toBe(true)
  })

  it('hides every panel that is not the note', () => {
    for (const selector of ['.app-sidebar-panel', '.note-list-panel', '.inspector-panel', '.ai-panel', '.status-bar', '.breadcrumb-bar', '.editor-agent-composer', '.heading-outline']) {
      expect(printBlock).toContain(selector)
    }
    expect(printBlock).toContain('display: none !important')
  })

  it('keeps a 70ch serif measure with page margins', () => {
    expect(printBlock).toContain('max-width: 70ch !important')
    expect(printBlock).toContain('var(--font-serif')
    expect(printBlock).toContain('margin: 20mm')
  })

  it('shows external link targets but not wikilinks', () => {
    expect(printBlock).toContain("a[href^='http']::after")
    expect(printBlock).toContain('attr(href)')
  })

  it('uses tokens, never hex literals', () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
