import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('AI brief theme CSS', () => {
  const css = readFileSync(`${process.cwd()}/src/theme-ai-brief.css`, 'utf8')

  it('keeps the compact Crystallize packet theme-owned', () => {
    expect(css).toContain('.grimoire-ai-brief__context-strip')
    expect(css).toContain('.grimoire-ai-brief__context-strip [data-metric]')
    expect(css).toContain('.grimoire-ai-brief__context-strip[data-locality="protected-local"]')
    expect(css).toContain('.grimoire-ai-brief__memory-strip')
    expect(css).toContain('.grimoire-ai-brief__memory-strip [data-metric]')
    expect(css).toContain('border-color: var(--grimoire-signal-border)')
    expect(css).toContain('background:')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}|rgba\(/iu)
  })
})
