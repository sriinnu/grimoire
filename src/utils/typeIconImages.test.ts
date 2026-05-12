import { describe, expect, it } from 'vitest'
import { TYPE_ICON_IMAGE_OPTIONS } from './typeIconImages'

describe('TYPE_ICON_IMAGE_OPTIONS', () => {
  it('ships a broad built-in SVG badge set', () => {
    expect(TYPE_ICON_IMAGE_OPTIONS.length).toBeGreaterThanOrEqual(20)
  })

  it('uses unique ids and labels', () => {
    const ids = TYPE_ICON_IMAGE_OPTIONS.map((option) => option.id)
    const labels = TYPE_ICON_IMAGE_OPTIONS.map((option) => option.label)

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('stores portable SVG data URLs', () => {
    for (const option of TYPE_ICON_IMAGE_OPTIONS) {
      expect(option.value).toMatch(/^data:image\/svg\+xml;utf8,/)
      expect(decodeURIComponent(option.value)).toContain('<svg')
    }
  })
})
