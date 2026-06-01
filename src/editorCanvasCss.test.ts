import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('editor canvas CSS', () => {
  it('lets the editor card and composer stretch with the pane while text stays readable', () => {
    const css = readFileSync(`${process.cwd()}/src/theme-editor-canvas.css`, 'utf8')

    expect(css).toContain('.editor-content-wrapper')
    expect(css).toContain('--editor-composer-clearance: clamp(20px, 3vh, 36px)')
    expect(css).toContain('flex: 0 0 auto')
    expect(css).toContain('min-height: 100%')
    expect(css).toContain('max-width: min(1320px')
    expect(css).toContain('.editor-agent-composer-wrap')
    expect(css).toContain('.bn-editor')
    expect(css).toContain('max-width: min(var(--editor-max-width')
  })
})
