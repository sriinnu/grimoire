import type { VaultEntry } from '../types'

const HTML_PATH_PATTERN = /\.(?:html?|xhtml)$/iu
const STANDALONE_HTML_START_PATTERN = /^\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/iu
const HTML_BLOCK_PATTERN = /^\s*<(main|section|article|div|p|h[1-6]|ul|ol|table|svg)\b[\s\S]*<\/\1>/iu
const BLOCKED_ELEMENTS = new Set(['base', 'embed', 'iframe', 'object', 'script'])
const URL_ATTRIBUTES = new Set(['action', 'formaction', 'href', 'src', 'xlink:href'])

function previewPath(entry: Pick<VaultEntry, 'filename' | 'path'>): string {
  return entry.path || entry.filename
}

function isUnsafeUrl(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  return normalized.startsWith('javascript:') || normalized.startsWith('data:text/html')
}

function sanitizeElement(element: Element) {
  if (BLOCKED_ELEMENTS.has(element.tagName.toLowerCase())) {
    element.remove()
    return
  }

  for (const attr of Array.from(element.attributes)) {
    const name = attr.name.toLowerCase()
    if (name.startsWith('on') || name === 'srcdoc') {
      element.removeAttribute(attr.name)
      continue
    }

    if (URL_ATTRIBUTES.has(name) && isUnsafeUrl(attr.value)) {
      element.removeAttribute(attr.name)
    }
  }

  for (const child of Array.from(element.children)) {
    sanitizeElement(child)
  }
}

function sanitizeDocument(doc: Document) {
  for (const child of Array.from(doc.documentElement.children)) {
    sanitizeElement(child)
  }
}

/** Returns true when the vault entry should open as rendered HTML by default. */
export function isRenderableHtmlEntry(entry: Pick<VaultEntry, 'fileKind' | 'filename' | 'path'>, content: string): boolean {
  if (HTML_PATH_PATTERN.test(previewPath(entry))) return true
  if (entry.fileKind !== 'text' && entry.fileKind !== 'markdown') return false

  const trimmed = content.trim()
  return STANDALONE_HTML_START_PATTERN.test(trimmed) || HTML_BLOCK_PATTERN.test(trimmed)
}

/** Builds a sandboxed preview document for HTML source from the vault. */
export function buildHtmlPreviewDocument(source: string): string {
  if (typeof DOMParser === 'undefined') return source

  const doc = new DOMParser().parseFromString(source, 'text/html')
  sanitizeDocument(doc)

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<base target="_blank">',
    '<style>html{color-scheme:light dark}body{margin:24px;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}img,svg,video{max-width:100%;height:auto}table{border-collapse:collapse}td,th{border:1px solid #d6d6d6;padding:6px 8px}</style>',
    doc.head.innerHTML,
    '</head>',
    '<body>',
    doc.body.innerHTML,
    '</body>',
    '</html>',
  ].join('')
}
