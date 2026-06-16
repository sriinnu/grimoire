import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork polish CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')

  it('keeps settings-preview artwork polish as one quiet watermark layer', () => {
    const css = readText(`${process.cwd()}/src/sidebar-artwork-polish.css`)

    expect(css).toContain('--art-polish-opacity-duration')
    expect(css).toContain('.sidebar-artwork__glyph--notebook-thread')
    expect(css).toContain('filter: none')
    expect(css).toContain('[data-sidebar-preset-preview] {')
    expect(css).not.toContain('.app-sidebar-panel')
    expect(css).not.toContain('drop-shadow')
    expect(css).not.toContain('.sidebar-artwork__glyph--notebook-atlas')
    expect(css).not.toContain('.sidebar-artwork__signal')
    expect(css).not.toContain('.sidebar-artwork__token')
    expect(css).not.toContain('[data-theme-preset="code-notebook"] .app-sidebar-panel .sidebar-artwork__token')
  })

  it('keeps artwork polish reduced-motion aware without decorative entry motion', () => {
    const css = readText(`${process.cwd()}/src/sidebar-artwork-polish.css`)

    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).not.toContain('@keyframes')
    expect(css).not.toContain('animation:')
    expect(css).not.toContain('infinite')
  })

  it('does not import or ship the removed pouch intake effect', () => {
    const main = readText(`${process.cwd()}/src/main.tsx`)

    expect(main).not.toContain("import './sidebar-pouch-effect.css'")
    expect(() => readText(`${process.cwd()}/src/sidebar-pouch-effect.css`)).toThrow()
  })
})
