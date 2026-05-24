import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('NoteListChrome CSS', () => {
  const css = readFileSync(`${process.cwd()}/src/components/note-list/NoteListChrome.css`, 'utf8')

  it('keeps project and filter wrappers flat instead of nesting cards inside the pane', () => {
    const projectRule = css.match(/\.project-workspace-chrome\s*\{[^}]+\}/)?.[0] ?? ''
    const filterShelfRule = css.match(/\.note-list-filter-shelf\s*\{[^}]+\}/)?.[0] ?? ''

    expect(projectRule).toContain('border: 0')
    expect(projectRule).toContain('background: transparent')
    expect(filterShelfRule).toContain('border: 0')
    expect(filterShelfRule).toContain('background: transparent')
  })

  it('stacks project chrome controls in narrow sidebars instead of scattering the rail', () => {
    const narrowCss = css.slice(css.indexOf('@container (max-width: 320px)'))
    const narrowChromeRule = narrowCss.match(/\.project-workspace-chrome__overview\s*\{[^}]+\}/)?.[0] ?? ''
    const filterShelfRule = css.match(/\.note-list-filter-shelf\s*\{[^}]+\}/)?.[0] ?? ''

    expect(css).toContain('@container (max-width: 320px)')
    expect(narrowChromeRule).toContain('grid-template-columns: 1fr')
    expect(filterShelfRule).toContain('flex-wrap: nowrap')
    expect(filterShelfRule).toContain('overflow-x: auto')
  })
})
