import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('PersonalCalendar CSS', () => {
  it('keeps the custom calendar responsive and finite-motion only', () => {
    const css = readFileSync(`${process.cwd()}/src/components/personal-calendar/PersonalCalendar.css`, 'utf8')
    const rootRule = css.match(/\.personal-calendar\s*\{[^}]+\}/u)?.[0] ?? ''
    const gridRule = css.match(/\.personal-calendar__grid\s*\{[^}]+\}/u)?.[0] ?? ''
    const cellRule = css.match(/\.personal-calendar__cell\s*\{[^}]+\}/u)?.[0] ?? ''

    expect(rootRule).toContain('container-type: inline-size')
    expect(rootRule).toContain('--personal-calendar-cell-block-size: clamp(42px, 8cqi, 68px)')
    expect(rootRule).toContain('align-self: stretch')
    expect(rootRule).toContain('justify-self: stretch')
    expect(rootRule).toContain('width: 100%')
    expect(css).toContain('.personal-calendar[data-density="compact"]')
    expect(css).toContain('--personal-calendar-cell-block-size: clamp(36px, 6cqi, 54px)')
    expect(css).toContain('grid-template-columns: repeat(7, minmax(0, 1fr))')
    expect(css).toContain('gap: clamp(3px, 1vw, 6px)')
    expect(css).toContain('overflow: hidden')
    expect(gridRule).toContain('width: 100%')
    expect(cellRule).toContain('height: var(--personal-calendar-cell-block-size)')
    expect(cellRule).toContain('min-height: var(--personal-calendar-cell-block-size)')
    expect(cellRule).toContain('block-size: auto')
    expect(css).toContain('@container personal-calendar (max-width: 520px)')
    expect(css).not.toMatch(/font-size:[^;{}]*vw/u)
    expect(css).toContain('@media (prefers-reduced-motion: no-preference)')
    expect(css).toContain('@keyframes personal-calendar-pop')
    expect(css).not.toContain('infinite')
  })
})
