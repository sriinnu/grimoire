import { describe, expect, it } from 'vitest'
import { extractNoteHeadings } from '../../utils/noteNavigation'
import {
  buildOutlineRailItems,
  pickActiveOutlineIndex,
  shouldShowOutlineRail,
} from './headingOutlineModel'

describe('buildOutlineRailItems', () => {
  it('keeps H1–H3 from the shared heading source with their full-list index', () => {
    const headings = extractNoteHeadings('# Title\n\n## Setup\n\n#### Deep\n\n### Detail\n')
    const items = buildOutlineRailItems(headings)

    expect(items.map((item) => [item.heading.text, item.index, item.indent])).toEqual([
      ['Title', 0, 0],
      ['Setup', 1, 1],
      ['Detail', 3, 2],
    ])
  })

  it('indents relative to the shallowest level present', () => {
    const items = buildOutlineRailItems(extractNoteHeadings('## One\n\n### Two\n\n## Three\n'))
    expect(items.map((item) => item.indent)).toEqual([0, 1, 0])
  })

  it('ignores headings inside fenced code', () => {
    const items = buildOutlineRailItems(extractNoteHeadings('# Real\n\n```\n# fake\n```\n'))
    expect(items.map((item) => item.heading.text)).toEqual(['Real'])
  })
})

describe('shouldShowOutlineRail', () => {
  it('needs the toggle, a wide canvas and at least three headings', () => {
    expect(shouldShowOutlineRail({ enabled: true, wide: true, itemCount: 3 })).toBe(true)
    expect(shouldShowOutlineRail({ enabled: true, wide: true, itemCount: 2 })).toBe(false)
    expect(shouldShowOutlineRail({ enabled: true, wide: false, itemCount: 5 })).toBe(false)
    expect(shouldShowOutlineRail({ enabled: false, wide: true, itemCount: 5 })).toBe(false)
  })
})

describe('pickActiveOutlineIndex', () => {
  it('picks the last heading above the reading line', () => {
    expect(pickActiveOutlineIndex([10, 90, 400], 100, false)).toBe(1)
  })

  it('falls back to the first mounted heading before any has been passed', () => {
    expect(pickActiveOutlineIndex([null, 300, 600], 100, false)).toBe(1)
  })

  it('selects the last heading once scrolled to the bottom', () => {
    expect(pickActiveOutlineIndex([-500, -200, 700], 100, true)).toBe(2)
  })

  it('returns -1 when nothing is mounted', () => {
    expect(pickActiveOutlineIndex([null, null], 100, false)).toBe(-1)
  })
})
