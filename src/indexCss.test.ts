import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('index CSS shell chrome rules', () => {
  const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')

  it('reserves platform-specific safe zones for titlebar and collapsed rail', () => {
    expect(css).toContain('--macos-overlay-rail-safe-top: 88px')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
    expect(css).toContain('padding-top: var(--macos-overlay-rail-safe-top) !important')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
    expect(css).toContain('--sidebar-title-bar-height: 60px')
    expect(css).toContain('--sidebar-rail-safe-top: var(--sidebar-title-bar-height, 60px)')
    expect(css).toContain('body.windows-chrome .sidebar-title-bar')
    expect(css).toContain('height: var(--sidebar-title-bar-height) !important')
    expect(css).toContain('body.windows-chrome .app-sidebar-rail')
    expect(css).toContain('padding-top: var(--sidebar-rail-safe-top) !important')
  })
})
