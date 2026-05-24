import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/motion-agent-council.css`, 'utf8')

function cssSection(start: string, end?: string): string {
  const startIndex = css.indexOf(start)
  expect(startIndex).toBeGreaterThanOrEqual(0)
  if (!end) return css.slice(startIndex)

  const endIndex = css.indexOf(end, startIndex + start.length)
  expect(endIndex).toBeGreaterThan(startIndex)
  return css.slice(startIndex, endIndex)
}

describe('Agent Council motion CSS', () => {
  it('defines staged member and synthesis primitives', () => {
    expect(css).toContain('.grimoire-agent-council__member')
    expect(css).toContain('.grimoire-agent-council__brief')
    expect(css).toContain('@keyframes grimoire-agent-council-synthesis')
  })

  it('keeps synthesis animation compositor-friendly', () => {
    const keyframes = cssSection(
      '@keyframes grimoire-agent-council-synthesis',
      '@media (prefers-reduced-motion: reduce)',
    )

    expect(keyframes).toContain('opacity:')
    expect(keyframes).toContain('transform:')
    expect(keyframes).not.toMatch(/\b(?:filter|left|right|top|bottom|width|height):/u)
  })

  it('removes Agent Council movement for reduced-motion users', () => {
    const reducedMotion = cssSection('@media (prefers-reduced-motion: reduce)')

    expect(reducedMotion).toContain('.grimoire-agent-council__member')
    expect(reducedMotion).toContain('.grimoire-agent-council__brief')
    expect(reducedMotion).toContain('animation: none')
    expect(reducedMotion).toContain('transform: none')
  })
})
