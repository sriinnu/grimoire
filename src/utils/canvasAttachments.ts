export type CanvasKind = 'handwriting' | 'whiteboard'

export interface CanvasAttachment {
  index: number
  title: string
  kind: CanvasKind
  source: string
  preview: string
}

export interface CanvasPoint {
  x: number
  y: number
  pressure: number
  at: number
}

export interface CanvasStroke {
  id: string
  color: string
  size: number
  tool: 'pen' | 'highlighter'
  points: CanvasPoint[]
}

export interface CanvasDocument {
  version: 1
  kind: CanvasKind
  width: number
  height: number
  background: string
  strokes: CanvasStroke[]
  updatedAt: string
}

const CANVAS_FENCE_PATTERN = /```grimoire-canvas\s*\n([\s\S]*?)\n```/g
const IMAGE_BEFORE_FENCE_PATTERN = /!\[([^\]]*)\]\(([^)\s"]+)(?:\s+"[^"]*")?\)\s*$/
const DEFAULT_CANVAS_SIZE = { width: 1600, height: 1000 }

function metadataValue(body: string, key: string): string | null {
  const pattern = new RegExp(`^${key}:\\s*(.+)$`, 'im')
  return body.match(pattern)?.[1]?.trim() ?? null
}

function canvasKind(value: string | null): CanvasKind {
  return value === 'whiteboard' ? 'whiteboard' : 'handwriting'
}

function fallbackPreview(markdown: string, fenceStart: number): { title: string; preview: string | null } {
  const before = markdown.slice(0, fenceStart)
  const image = before.match(IMAGE_BEFORE_FENCE_PATTERN)
  return {
    title: image?.[1]?.trim() || 'Canvas',
    preview: image?.[2]?.trim() ?? null,
  }
}

/** Extracts durable Grimoire canvas attachment references from Markdown fences. */
export function parseCanvasAttachments(markdown: string): CanvasAttachment[] {
  const attachments: CanvasAttachment[] = []
  for (const match of markdown.matchAll(CANVAS_FENCE_PATTERN)) {
    const body = match[1] ?? ''
    const fallback = fallbackPreview(markdown, match.index ?? 0)
    const source = metadataValue(body, 'source')
    const preview = metadataValue(body, 'preview') ?? fallback.preview
    if (!source || !preview) continue

    attachments.push({
      index: attachments.length,
      title: fallback.title,
      kind: canvasKind(metadataValue(body, 'type')),
      source,
      preview,
    })
  }
  return attachments
}

/** Creates a blank editable canvas document for a Markdown attachment. */
export function createCanvasDocument(kind: CanvasKind): CanvasDocument {
  return {
    version: 1,
    kind,
    width: DEFAULT_CANVAS_SIZE.width,
    height: DEFAULT_CANVAS_SIZE.height,
    background: '#fffdf8',
    strokes: [],
    updatedAt: new Date().toISOString(),
  }
}

/** Safely resolves an attachment path under the open vault root. */
export function resolveVaultAttachmentPath(vaultPath: string, attachmentPath: string): string {
  const root = vaultPath.replace(/\/+$/, '')
  const clean = attachmentPath.replace(/^\/+/, '')
  return `${root}/${clean}`
}

/** Finds the canvas attachment whose preview image was clicked in the editor. */
export function canvasAttachmentForImageSrc(
  attachments: CanvasAttachment[],
  imageSrc: string,
): CanvasAttachment | null {
  let decoded = imageSrc
  try {
    decoded = decodeURIComponent(imageSrc)
  } catch {
    decoded = imageSrc
  }

  return attachments.find((attachment) => (
    decoded.endsWith(attachment.preview) || decoded.includes(`/${attachment.preview}`)
  )) ?? null
}

function isCanvasDocument(value: unknown): value is CanvasDocument {
  const candidate = value as Partial<CanvasDocument>
  return candidate?.version === 1
    && (candidate.kind === 'handwriting' || candidate.kind === 'whiteboard')
    && Array.isArray(candidate.strokes)
}

/** Parses saved canvas JSON, falling back to a blank document when the source is missing or stale. */
export function parseCanvasDocumentJson(raw: string, kind: CanvasKind): CanvasDocument {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (isCanvasDocument(parsed)) return parsed
  } catch {
    // Missing or malformed canvas sources should not break note editing.
  }
  return createCanvasDocument(kind)
}
