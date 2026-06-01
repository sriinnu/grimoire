import type {
  CanvasDocument,
  CanvasPlacedImage,
  CanvasShape,
  CanvasStroke,
  CanvasTextBox,
} from '../../utils/canvasAttachments'

export type CanvasImageSourceResolver = (src: string) => string
export type CanvasRenderGuard = () => boolean

function strokeAlpha(stroke: CanvasStroke): number {
  return stroke.tool === 'highlighter' ? 0.28 : 1
}

function layerOrder(document: CanvasDocument): string[] {
  const ids = [
    ...document.images.map((image) => image.id),
    ...document.shapes.map((shape) => shape.id),
    ...document.strokes.map((stroke) => stroke.id),
    ...document.textBoxes.map((textBox) => textBox.id),
  ]
  return [...document.layerOrder.filter((id) => ids.includes(id)), ...ids.filter((id) => !document.layerOrder.includes(id))]
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null)
      return
    }
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function readCanvasThemeColor(variableName: string, fallback: string): string {
  const root = globalThis.document?.documentElement
  if (!root || typeof globalThis.getComputedStyle !== 'function') return fallback
  const value = globalThis.getComputedStyle(root).getPropertyValue(variableName).trim()
  if (!value || value.includes('var(')) return fallback
  return value
}

function drawImagePlaceholder(ctx: CanvasRenderingContext2D, image: CanvasPlacedImage) {
  ctx.save()
  ctx.fillStyle = readCanvasThemeColor('--muted', '#e5e7eb')
  ctx.strokeStyle = readCanvasThemeColor('--muted-foreground', '#64748b')
  ctx.lineWidth = 2
  ctx.fillRect(image.x, image.y, image.width, image.height)
  ctx.strokeRect(image.x, image.y, image.width, image.height)
  ctx.restore()
}

async function drawPlacedImage(
  ctx: CanvasRenderingContext2D,
  image: CanvasPlacedImage,
  resolveImageSrc: CanvasImageSourceResolver,
  shouldContinue: CanvasRenderGuard,
) {
  const loaded = await loadImage(resolveImageSrc(image.src))
  if (!shouldContinue()) return
  if (!loaded) {
    drawImagePlaceholder(ctx, image)
    return
  }
  ctx.drawImage(loaded, image.x, image.y, image.width, image.height)
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: CanvasStroke) {
  if (stroke.points.length === 0) return

  ctx.save()
  ctx.globalAlpha = strokeAlpha(stroke)
  ctx.strokeStyle = stroke.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = stroke.size

  const [first, second] = stroke.points
  ctx.beginPath()
  ctx.moveTo(first.x, first.y)
  if (!second) {
    ctx.lineTo(first.x + 0.1, first.y + 0.1)
  } else {
    for (let index = 1; index < stroke.points.length - 1; index++) {
      const current = stroke.points[index]
      const next = stroke.points[index + 1]
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
    }
    const last = stroke.points[stroke.points.length - 1]
    ctx.lineTo(last.x, last.y)
  }
  ctx.stroke()
  ctx.restore()
}

function drawShape(ctx: CanvasRenderingContext2D, shape: CanvasShape) {
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = shape.size
  if (shape.kind === 'rectangle') {
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height)
  } else if (shape.kind === 'ellipse') {
    ctx.beginPath()
    ctx.ellipse(
      shape.x + shape.width / 2,
      shape.y + shape.height / 2,
      Math.max(shape.width / 2, 1),
      Math.max(shape.height / 2, 1),
      0,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(shape.x, shape.y)
    ctx.lineTo(shape.x + shape.width, shape.y + shape.height)
    ctx.stroke()
  }
  ctx.restore()
}

function drawTextBox(ctx: CanvasRenderingContext2D, textBox: CanvasTextBox) {
  ctx.save()
  ctx.fillStyle = textBox.color
  ctx.font = `${textBox.size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
  const lineHeight = textBox.size * 1.35
  textBox.text.split('\n').forEach((line, index) => {
    ctx.fillText(line, textBox.x, textBox.y + index * lineHeight, textBox.width)
  })
  ctx.restore()
}

async function drawLayerById(
  ctx: CanvasRenderingContext2D,
  document: CanvasDocument,
  id: string,
  resolveImageSrc: CanvasImageSourceResolver,
  shouldContinue: CanvasRenderGuard,
): Promise<void> {
  const image = document.images.find((item) => item.id === id)
  if (image) return drawPlacedImage(ctx, image, resolveImageSrc, shouldContinue)
  const shape = document.shapes.find((item) => item.id === id)
  if (shape) return drawShape(ctx, shape)
  const stroke = document.strokes.find((item) => item.id === id)
  if (stroke) return drawStroke(ctx, stroke)
  const textBox = document.textBoxes.find((item) => item.id === id)
  if (textBox) drawTextBox(ctx, textBox)
}

/** Draws a saved Grimoire canvas document into a 2D canvas context. */
export async function drawCanvasDocument(
  ctx: CanvasRenderingContext2D,
  document: CanvasDocument,
  resolveImageSrc: CanvasImageSourceResolver = (src) => src,
  shouldContinue: CanvasRenderGuard = () => true,
) {
  if (!shouldContinue()) return
  ctx.clearRect(0, 0, document.width, document.height)
  ctx.fillStyle = document.background
  ctx.fillRect(0, 0, document.width, document.height)
  for (const id of layerOrder(document)) {
    if (!shouldContinue()) return
    await drawLayerById(ctx, document, id, resolveImageSrc, shouldContinue)
  }
}

/** Exports the canvas document as base64 PNG data for the Markdown preview image. */
export async function exportCanvasPreview(
  document: CanvasDocument,
  resolveImageSrc: CanvasImageSourceResolver = (src) => src,
): Promise<string> {
  const canvas = window.document.createElement('canvas')
  canvas.width = document.width
  canvas.height = document.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  await window.document.fonts?.ready
  await drawCanvasDocument(ctx, document, resolveImageSrc)
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '')
}
