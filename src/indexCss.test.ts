import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('index CSS shell chrome rules', () => {
  const css = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')

  it('reserves a traffic-light-safe zone for the collapsed sidebar rail on macOS', () => {
    expect(css).toContain('--macos-overlay-rail-safe-top: 82px')
    expect(css).toContain('body.macos-overlay-chrome .app-sidebar-rail')
    expect(css).toContain('padding-top: var(--macos-overlay-rail-safe-top) !important')
  })
})
