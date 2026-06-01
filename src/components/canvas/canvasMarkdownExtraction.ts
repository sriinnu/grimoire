import type {
  CanvasDocument,
  CanvasPlacedImage,
  CanvasShape,
  CanvasStroke,
  CanvasTextBox,
} from '../../utils/canvasAttachments'
import type { CanvasSelection } from './canvasDrawing'

interface CanvasMarkdownExtractionOptions {
  selection?: CanvasSelection | null
  title?: string
}

type CanvasLayer =
  | { id: string; kind: 'image'; value: CanvasPlacedImage }
  | { id: string; kind: 'shape'; value: CanvasShape }
  | { id: string; kind: 'stroke'; value: CanvasStroke }
  | { id: string; kind: 'text'; value: CanvasTextBox }

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function pointLabel(point: { x: number; y: number }): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`
}

function layerOrder(document: CanvasDocument): string[] {
  const ids = [
    ...document.images.map((image) => image.id),
    ...document.shapes.map((shape) => shape.id),
    ...document.strokes.map((stroke) => stroke.id),
    ...document.textBoxes.map((textBox) => textBox.id),
  ]
  return [
    ...document.layerOrder.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !document.layerOrder.includes(id)),
  ]
}

function selectedIds(selection: CanvasSelection | null | undefined): Set<string> | null {
  if (!selection) return null
  const ids = [
    ...selection.images,
    ...selection.shapes,
    ...selection.strokes,
    ...selection.textBoxes,
  ]
  return ids.length > 0 ? new Set(ids) : null
}

function layerById(document: CanvasDocument, id: string): CanvasLayer | null {
  const image = document.images.find((item) => item.id === id)
  if (image) return { id, kind: 'image', value: image }
  const shape = document.shapes.find((item) => item.id === id)
  if (shape) return { id, kind: 'shape', value: shape }
  const stroke = document.strokes.find((item) => item.id === id)
  if (stroke) return { id, kind: 'stroke', value: stroke }
  const textBox = document.textBoxes.find((item) => item.id === id)
  if (textBox) return { id, kind: 'text', value: textBox }
  return null
}

function orderedLayers(document: CanvasDocument, selection?: CanvasSelection | null): CanvasLayer[] {
  const selected = selectedIds(selection)
  return layerOrder(document)
    .filter((id) => !selected || selected.has(id))
    .map((id) => layerById(document, id))
    .filter((layer): layer is CanvasLayer => Boolean(layer))
}

function textSummary(textBox: CanvasTextBox): string {
  const text = textBox.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' / ')
  return `- Text: ${text} at ${pointLabel(textBox)}`
}

function imageSummary(image: CanvasPlacedImage): string {
  return `- Image: ${image.src} at ${pointLabel(image)}, ${formatNumber(image.width)}x${formatNumber(image.height)}`
}

function shapeSummary(shape: CanvasShape): string {
  if (shape.kind === 'line') {
    return `- Line: ${pointLabel(shape)} -> ${pointLabel({ x: shape.x + shape.width, y: shape.y + shape.height })}`
  }
  return `- ${shape.kind[0].toUpperCase()}${shape.kind.slice(1)}: ${pointLabel(shape)}, ${formatNumber(shape.width)}x${formatNumber(shape.height)}`
}

function strokeBounds(stroke: CanvasStroke): string {
  if (stroke.points.length === 0) return 'no points'
  const xs = stroke.points.map((point) => point.x)
  const ys = stroke.points.map((point) => point.y)
  return `${pointLabel({ x: Math.min(...xs), y: Math.min(...ys) })} -> ${pointLabel({ x: Math.max(...xs), y: Math.max(...ys) })}`
}

function strokePath(stroke: CanvasStroke): string {
  const points = stroke.points.slice(0, 6).map(pointLabel)
  const suffix = stroke.points.length > points.length ? ' -> ...' : ''
  return `${points.join(' -> ')}${suffix}`
}

function strokeSummary(stroke: CanvasStroke): string {
  const label = stroke.tool === 'highlighter' ? 'Highlighter stroke' : 'Pen stroke'
  return `- ${label}: ${stroke.points.length} point${stroke.points.length === 1 ? '' : 's'}, bounds ${strokeBounds(stroke)}, path ${strokePath(stroke)}`
}

function layerSummary(layer: CanvasLayer): string {
  if (layer.kind === 'image') return imageSummary(layer.value)
  if (layer.kind === 'shape') return shapeSummary(layer.value)
  if (layer.kind === 'stroke') return strokeSummary(layer.value)
  return textSummary(layer.value)
}

/** Converts local canvas layers into portable Markdown for notes or agent handoff. */
export function extractCanvasDocumentMarkdown(
  document: CanvasDocument,
  options: CanvasMarkdownExtractionOptions = {},
): string {
  const layers = orderedLayers(document, options.selection)
  const title = options.title ?? `${document.kind[0].toUpperCase()}${document.kind.slice(1)} Canvas`
  const scope = selectedIds(options.selection) ? 'Selected layers' : 'All layers'
  const lines = [
    `## Canvas Extraction - ${title}`,
    '',
    `- Kind: ${document.kind}`,
    `- Size: ${document.width}x${document.height}`,
    `- Scope: ${scope}`,
    `- Layers: ${layers.length}`,
    '',
  ]

  if (layers.length === 0) {
    return [...lines, 'No drawable layers yet.'].join('\n')
  }

  return [...lines, ...layers.map(layerSummary)].join('\n')
}
