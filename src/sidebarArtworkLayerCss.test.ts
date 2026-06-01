import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sidebar artwork layer CSS', () => {
  it('reserves scroll space so ambient artwork cannot cover folder text', () => {
    const css = readFileSync(`${process.cwd()}/src/sidebar-artwork-layer.css`, 'utf8')

    expect(css).toContain('--sidebar-artwork-safe-space: calc(clamp(148px, 22vh, 220px) + 38px)')
    expect(css).toContain('isolation: isolate')
    expect(css).toContain('.app-sidebar-nav')
    expect(css).toContain('background: var(--sidebar)')
    expect(css).toContain('margin-bottom: var(--sidebar-artwork-safe-space)')
    expect(css).toContain('scroll-padding-bottom: var(--sidebar-artwork-safe-space)')
    expect(css).toContain('.sidebar-artwork')
    expect(css).toContain('z-index: 0')
    expect(css).toContain('.app-sidebar-panel::after')
    expect(css).toContain('z-index: 1')
    expect(css).toContain('button, a, [role="button"], input')
    expect(css).toContain('[data-folder-row-tone]')
    expect(css).toContain('--sidebar-artwork-safe-space: 124px')
  })
})
