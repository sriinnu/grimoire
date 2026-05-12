import { describe, expect, it } from 'vitest'
import { isOpaqueBinaryEntry, isPreviewableImageEntry, isPreviewableImagePath } from './filePreviews'

describe('filePreviews', () => {
  it('recognizes common image extensions including SVG', () => {
    expect(isPreviewableImagePath('attachments/logo.svg')).toBe(true)
    expect(isPreviewableImagePath('attachments/photo.JPG')).toBe(true)
    expect(isPreviewableImagePath('attachments/clip.webp')).toBe(true)
  })

  it('treats image binaries as previewable rather than opaque', () => {
    const entry = {
      fileKind: 'binary' as const,
      filename: 'logo.svg',
      path: '/vault/attachments/logo.svg',
    }

    expect(isPreviewableImageEntry(entry)).toBe(true)
    expect(isOpaqueBinaryEntry(entry)).toBe(false)
  })

  it('keeps unknown binary formats opaque', () => {
    const entry = {
      fileKind: 'binary' as const,
      filename: 'archive.zip',
      path: '/vault/archive.zip',
    }

    expect(isPreviewableImageEntry(entry)).toBe(false)
    expect(isOpaqueBinaryEntry(entry)).toBe(true)
  })
})
