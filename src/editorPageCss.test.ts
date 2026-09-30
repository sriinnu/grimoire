import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync(`${process.cwd()}/src/editor-page.css`, 'utf8')

describe('editor page CSS', () => {
  it('uses theme tokens only, never hex literals', () => {
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })

  it('lets wide blocks break out of the measure while text keeps the reading width', () => {
    // The wrapper is the container so 100cqw is the room actually on the page.
    expect(css).toContain('.editor-content-wrapper {\n  container: editor-page / inline-size;')
    expect(css).toContain('--editor-wide-block-width: max(100%, min(1200px, 100cqw))')
    expect(css).toContain('margin-inline: calc((100% - var(--editor-wide-block-width)) / 2)')
    // Only top-level blocks of these kinds grow; nested list content never does.
    expect(css).toContain('.bn-editor > .bn-block-group > .bn-block-outer:has(')
    for (const type of ['table', 'image', 'video', 'audio', 'file']) {
      expect(css).toContain(`[data-content-type='${type}']`)
    }
    // Left-aligned layout hugs the left edge instead of centring.
    expect(css).toContain('.editor-content-layout--left')
    expect(css).toContain('margin-inline: 0 calc(100% - var(--editor-wide-block-width))')
  })

  it('hides the outline rail at full reading width', () => {
    expect(css).toContain(".editor-canvas[data-reading-width='full'] .heading-outline {\n  display: none;")
  })
})
