import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/notebook-page.css`, 'utf8')
const main = readFileSync(`${process.cwd()}/src/main.tsx`, 'utf8')

describe('notebook page CSS', () => {
  it('loads after the editor page layer so it wins by order, not !important', () => {
    expect(main.indexOf("import './notebook-page.css'")).toBeGreaterThan(main.indexOf("import './editor-page.css'"))
    expect(css).not.toContain('!important')
  })

  it('lays the page out as one calm column with the capture card as the only card', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)')
    expect(css).toContain('max-width: 880px')
    expect(css).toContain(':root[data-theme-preset] .dashboard-hero {')
    expect(css).toContain(':root[data-theme-preset] .dashboard-hero__aurora {\n  display: none;')
    expect(css).toContain(':root[data-theme-preset] .vault-dashboard__panel:not(.vault-dashboard__panel--capture)')
    expect(css).toContain('border-top: 1px solid var(--grimoire-hairline)')
  })

  it('turns the stat tiles into a ledger line and the health shrine into a row', () => {
    expect(css).toContain(':root[data-theme-preset] .dashboard-stat-row {\n  display: flex;')
    expect(css).toContain('font-size: 24px;\n  line-height: 28px;')
    expect(css).toContain(':root[data-theme-preset] .vault-dashboard__health-body {\n  display: flex;')
  })

  it('keeps controls on the scale: 28px chips and pills, 32px submit, 6px radii', () => {
    expect(css).toContain('height: 28px;\n  padding-inline: 12px;')
    expect(css).toContain('min-height: 32px;\n  height: 32px;')
    expect(css).not.toMatch(/border-radius: 7px|font-size: 12\.5px|font-size: 10\.5px/)
  })
})
