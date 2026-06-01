import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const MOTION_FILES = ['src/motion.css', 'src/motion-memory.css'] as const
const css = MOTION_FILES.map((file) => readFileSync(`${process.cwd()}/${file}`, 'utf8')).join('\n')

function cssSection(start: string, end?: string): string {
  const startIndex = css.indexOf(start)
  expect(startIndex).toBeGreaterThanOrEqual(0)

  if (!end) return css.slice(startIndex)

  const endIndex = css.indexOf(end, startIndex + start.length)
  expect(endIndex).toBeGreaterThan(startIndex)
  return css.slice(startIndex, endIndex)
}

describe('motion CSS foundation', () => {
  it('keeps split motion files under the source LOC guardrail', () => {
    for (const file of MOTION_FILES) {
      const lines = readFileSync(`${process.cwd()}/${file}`, 'utf8').split('\n').length
      expect(lines, file).toBeLessThanOrEqual(400)
    }
  })

  it('defines reusable panel, control, and hover-lift primitives', () => {
    for (const token of [
      '--motion-duration-panel',
      '--motion-duration-control',
      '--motion-duration-hover',
      '--motion-duration-page-settle',
      '--motion-duration-ink-settle',
      '--motion-duration-state-pulse',
      '--motion-distance-panel-y',
      '--motion-distance-control-y',
      '--motion-distance-page-y',
      '--motion-distance-ink-y',
      '--motion-hover-lift-distance',
      '--motion-hover-shadow',
      '--motion-hover-border',
      '--motion-cancel-action-z-index',
    ]) {
      expect(css).toContain(token)
    }

    expect(css).toContain('.grimoire-panel-reveal')
    expect(css).toContain('.grimoire-command-stage')
    expect(css).toContain('.grimoire-settings-stage')
    expect(css).toContain('.grimoire-inspector-stage')
    expect(css).toContain('.grimoire-page-arrive')
    expect(css).toContain('.grimoire-ink-settle')
    expect(css).toContain('.grimoire-constellation-focus')
    expect(css).toContain('.grimoire-control-entrance')
    expect(css).toContain('.grimoire-soft-hover-lift')
    expect(css).toContain('.grimoire-page-settle')
    expect(css).toContain('.grimoire-state-pulse')
    expect(css).toContain('.grimoire-memory-trace')
    expect(css).toContain('.grimoire-crystallize-accept')
    expect(css).toContain('.grimoire-crystallize-accept__consequence')
    expect(css).toContain('.grimoire-import-autopsy')
    expect(css).toContain('.grimoire-import-autopsy__rail')
    expect(css).toContain('.grimoire-import-autopsy__step')
    expect(css).toContain('@keyframes grimoire-panel-reveal')
    expect(css).toContain('@keyframes grimoire-control-entrance')
    expect(css).toContain('@keyframes grimoire-page-settle')
    expect(css).toContain('@keyframes grimoire-ink-settle')
    expect(css).toContain('@keyframes grimoire-state-pulse')
    expect(css).toContain('@keyframes grimoire-memory-trace')
    expect(css).toContain('@keyframes grimoire-crystallize-accept')
    expect(css).toContain('@keyframes grimoire-crystallize-consequence')
    expect(css).toContain('@keyframes grimoire-import-autopsy-rail')
  })

  it('keeps cancel actions interactive above animated progress layers', () => {
    const cancellableSurface = cssSection(
      '[data-motion-cancellable="true"]',
      '[data-motion-cancellable="true"] [data-motion-cancel-action="true"]',
    )
    const cancelAction = cssSection(
      '[data-motion-cancellable="true"] [data-motion-cancel-action="true"]',
      '.grimoire-import-autopsy__step::before',
    )

    expect(cancellableSurface).toContain('isolation: isolate')
    expect(cancellableSurface).toContain('pointer-events: auto')
    expect(cancelAction).toContain('z-index: var(--motion-cancel-action-z-index)')
    expect(cancelAction).toContain('pointer-events: auto')
  })

  it('keeps entrance and page-settle animations limited to compositor-friendly properties', () => {
    const panelReveal = cssSection(
      '@keyframes grimoire-panel-reveal',
      '@keyframes grimoire-control-entrance',
    )
    const controlEntrance = cssSection(
      '@keyframes grimoire-control-entrance',
      '@keyframes grimoire-page-settle',
    )
    const pageSettle = cssSection(
      '@keyframes grimoire-page-settle',
      '@keyframes grimoire-ink-settle',
    )
    const inkSettle = cssSection(
      '@keyframes grimoire-ink-settle',
      '@keyframes grimoire-state-pulse',
    )
    const memoryTrace = cssSection(
      '@keyframes grimoire-memory-trace',
      '@keyframes grimoire-crystallize-accept',
    )
    const crystallizeAccept = cssSection(
      '@keyframes grimoire-crystallize-accept',
      '@keyframes grimoire-crystallize-consequence',
    )
    const crystallizeConsequence = cssSection(
      '@keyframes grimoire-crystallize-consequence',
      '@keyframes grimoire-import-autopsy-rail',
    )
    const importAutopsyRail = cssSection(
      '@keyframes grimoire-import-autopsy-rail',
      '@media (prefers-reduced-motion: reduce)',
    )
    const foundationMotion = [
      panelReveal,
      controlEntrance,
      pageSettle,
      inkSettle,
      memoryTrace,
      crystallizeAccept,
      crystallizeConsequence,
      importAutopsyRail,
    ].join('\n')

    expect(foundationMotion).toContain('opacity:')
    expect(foundationMotion).toContain('transform:')
    expect(foundationMotion).not.toMatch(/\b(?:filter|left|right|top|bottom|width|height):/u)
  })

  it('removes movement and transitions when reduced motion is requested', () => {
    const reducedMotion = cssSection('@media (prefers-reduced-motion: reduce)')

    expect(reducedMotion).toContain('--motion-duration-panel: 0ms')
    expect(reducedMotion).toContain('--motion-duration-control: 0ms')
    expect(reducedMotion).toContain('--motion-duration-hover: 0ms')
    expect(reducedMotion).toContain('--motion-duration-page-settle: 0ms')
    expect(reducedMotion).toContain('--motion-duration-ink-settle: 0ms')
    expect(reducedMotion).toContain('--motion-duration-state-pulse: 0ms')
    expect(reducedMotion).toContain('--motion-distance-panel-y: 0px')
    expect(reducedMotion).toContain('--motion-distance-control-y: 0px')
    expect(reducedMotion).toContain('--motion-distance-page-y: 0px')
    expect(reducedMotion).toContain('--motion-distance-ink-y: 0px')
    expect(reducedMotion).toContain('--motion-hover-lift-distance: 0px')
    expect(reducedMotion).toContain('.grimoire-panel-reveal')
    expect(reducedMotion).toContain('.grimoire-command-stage')
    expect(reducedMotion).toContain('.grimoire-settings-stage')
    expect(reducedMotion).toContain('.grimoire-inspector-stage')
    expect(reducedMotion).toContain('.grimoire-page-arrive')
    expect(reducedMotion).toContain('.grimoire-ink-settle')
    expect(reducedMotion).toContain('.grimoire-constellation-focus')
    expect(reducedMotion).toContain('.grimoire-control-entrance')
    expect(reducedMotion).toContain('.grimoire-page-settle')
    expect(reducedMotion).toContain('.grimoire-state-pulse')
    expect(reducedMotion).toContain('.grimoire-memory-trace')
    expect(reducedMotion).toContain('.grimoire-crystallize-accept')
    expect(reducedMotion).toContain('.grimoire-crystallize-accept__consequence')
    expect(reducedMotion).toContain('.grimoire-import-autopsy__rail')
    expect(reducedMotion).toContain('.grimoire-import-autopsy__step')
    expect(reducedMotion).toContain('animation: none')
    expect(reducedMotion).toContain('.grimoire-soft-hover-lift')
    expect(reducedMotion).toContain('transition: none')
    expect(reducedMotion).toContain('transform: none')
  })
})
