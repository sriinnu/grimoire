import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const craftCss = readFileSync(`${process.cwd()}/src/component-craft.css`, 'utf8')
const indexCss = readFileSync(`${process.cwd()}/src/index.css`, 'utf8')

describe('component craft layer', () => {
  it('is imported by the index stylesheet', () => {
    expect(indexCss).toContain('@import "./component-craft.css";')
  })

  it('gives core components tactile depth from the elevation ladder', () => {
    expect(craftCss).toContain('[data-slot="card"]')
    expect(craftCss).toContain('[data-slot="dialog-content"]')
    expect(craftCss).toContain('var(--elevation-5)')
    // Text fields read as recessed paper.
    expect(craftCss).toMatch(/\[data-slot="input"\][\s\S]*box-shadow: inset/u)
  })

  it('lifts solid buttons on hover and settles them on press', () => {
    expect(craftCss).toContain('transform: translateY(-1px)')
    expect(craftCss).toMatch(/:active:not\(:disabled\)[\s\S]*transform: translateY\(0\)/u)
  })

  it('disables component motion under reduced-motion preference', () => {
    expect(craftCss).toContain('@media (prefers-reduced-motion: no-preference)')
  })
})
