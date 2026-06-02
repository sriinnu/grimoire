import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork polish CSS', () => {
  const readText = (path: string): string => readFileSync(path, 'utf8').replace(/\r\n?/gu, '\n')

  it('adds theme-tonal knowledge tokens to the ambient sidebar sigil', () => {
    const css = readText(`${process.cwd()}/src/sidebar-artwork-polish.css`)

    expect(css).toContain('--art-token-veda')
    expect(css).toContain('--art-token-shaastra')
    expect(css).toContain('--art-token-purana')
    expect(css).toContain('--art-token-rishi')
    expect(css).toContain('--art-token-second-brain')
    expect(css).toContain('.sidebar-artwork__signal-line')
    expect(css).toContain('.sidebar-artwork__signal-orb')
    expect(css).toContain('.sidebar-artwork__token-aura')
    expect(css).toContain('.sidebar-artwork__token-disc')
    expect(css).toContain('.sidebar-artwork__token-mark')
    expect(css).toContain('[data-theme="dark"] .app-sidebar-panel .sidebar-artwork__token-disc')
    expect(css).toContain('[data-theme-preset="retro-terminal"] .app-sidebar-panel .sidebar-artwork__token')
    expect(css).toContain('.app-sidebar-panel,\n[data-sidebar-preset-preview] {')
  })

  it('keeps token motion finite, compositor-safe, and reduced-motion aware', () => {
    const css = readText(`${process.cwd()}/src/sidebar-artwork-polish.css`)

    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('@keyframes sidebar-token-bloom')
    expect(css).toContain('@keyframes sidebar-signal-arrive')
    expect(css).toContain('transform: scale')
    expect(css).toContain('transform: translateY')
    expect(css).not.toContain('infinite')
  })

  it('layers the pouch intake effect after the base artwork polish', () => {
    const css = readText(`${process.cwd()}/src/sidebar-pouch-effect.css`)
    const main = readText(`${process.cwd()}/src/main.tsx`)

    expect(main.indexOf("import './sidebar-pouch-effect.css'")).toBeGreaterThan(main.indexOf("import './sidebar-artwork-polish.css'"))
    expect(css).toContain('.sidebar-artwork__pouch-flow')
    expect(css).toContain('.sidebar-artwork__cloud-puff')
    expect(css).toContain('.sidebar-artwork__cloud-wisp')
    expect(css).toContain('.sidebar-artwork__pouch-mouth')
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('@keyframes sidebar-cloud-intake')
    expect(css).not.toContain('infinite')
  })
})
