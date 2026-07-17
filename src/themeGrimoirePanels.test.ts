import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const css = readFileSync(resolve(root, 'src/theme-grimoire-panels.css'), 'utf8')
const mainSource = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')

describe('Grimoire panel contract', () => {
  it('loads after the older panel decoration layers', () => {
    expect(mainSource.indexOf("import './theme-grimoire-panels.css'"))
      .toBeGreaterThan(mainSource.indexOf("import './icon-semantics.css'"))
  })

  it('keeps anchored panes flat and makes selection the strongest list surface', () => {
    expect(css).toContain('.app-sidebar-panel, .app-sidebar-rail')
    expect(css).toContain('background-image: none !important')
    expect(css).toContain('.note-list-panel [data-note-path][data-selected="true"]')
    expect(css).toContain('color-mix(in srgb, var(--note-type-color, var(--primary)) 15%, var(--surface-panel))')
    expect(css).toContain('[data-note-path][data-selected="true"]::before')
    expect(css).toContain('content: none !important')
    expect(css).toContain('thin leading signal')
    expect(css).toContain('width: 2.5px')
    expect(css).toContain('.note-current-document-state')
  })

  it('turns Second Brain cards into a section rhythm rather than nested surfaces', () => {
    expect(css).toContain('.inspector-panel :is(.inspector-card, .constellation-insights)')
    expect(css).toContain('border-bottom: 1px solid var(--grimoire-pane-hairline) !important')
    expect(css).toContain('border-radius: 0 !important')
    expect(css).toContain('.inspector-body > [data-slot="separator"]')
  })
})
