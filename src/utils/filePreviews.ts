import type { VaultEntry } from '../types'

const IMAGE_EXTENSION_PATTERN = /\.(?:avif|bmp|gif|jpe?g|png|svg|tiff?|webp)$/iu

function previewPath(entry: Pick<VaultEntry, 'filename' | 'path'>): string {
  return entry.path || entry.filename
}

/** Returns true for image files Grimoire can safely render through an img element. */
export function isPreviewableImagePath(path: string): boolean {
  return IMAGE_EXTENSION_PATTERN.test(path)
}

/** Returns true when a vault entry is an image attachment/file preview, including SVG. */
export function isPreviewableImageEntry(entry: Pick<VaultEntry, 'fileKind' | 'filename' | 'path'>): boolean {
  return entry.fileKind === 'binary' && isPreviewableImagePath(previewPath(entry))
}

/** Returns true for binary files that Grimoire should not try to open in the editor. */
export function isOpaqueBinaryEntry(entry: Pick<VaultEntry, 'fileKind' | 'filename' | 'path'>): boolean {
  return entry.fileKind === 'binary' && !isPreviewableImageEntry(entry)
}
