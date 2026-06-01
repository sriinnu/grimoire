import type { VaultEntry } from '../types'

const HTML_PATH_PATTERN = /\.(?:html?|xhtml)$/iu
const STANDALONE_HTML_START_PATTERN = /^\s*(?:<!doctype\s+html\b|<html\b|<head\b|<body\b)/iu
const HTML_BLOCK_PATTERN = /^\s*<(main|section|article|div|p|h[1-6]|ul|ol|table|svg)\b[\s\S]*<\/\1>/iu
const BLOCKED_ELEMENTS = new Set(['base', 'embed', 'iframe', 'object', 'script'])
const URL_ATTRIBUTES = new Set(['action', 'formaction', 'href', 'src', 'xlink:href'])
const CSS_VALUE_BLOCKLIST = /[<>{};]|url\s*\(|@import/iu
const CSS_COLOR_SCHEME_PATTERN = /^(?:normal|light|dark|light dark|dark light|only light|only dark)$/iu

export interface HtmlPreviewTheme {
  background: string
  border: string
  colorScheme: string
  foreground: string
  fontFamily: string
  link: string
  muted: string
}

export const DEFAULT_HTML_PREVIEW_THEME: HtmlPreviewTheme = {
  background: 'Canvas',
  border: 'color-mix(in srgb, CanvasText 22%, transparent)',
  colorScheme: 'light dark',
  foreground: 'CanvasText',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  link: 'LinkText',
  muted: 'GrayText',
}

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

function safeCssValue(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  if (!normalized || CSS_VALUE_BLOCKLIST.test(normalized)) return fallback
  return normalized
}

function safeColorScheme(value: string | undefined): string {
  const normalized = value?.trim()
  if (!normalized || !CSS_COLOR_SCHEME_PATTERN.test(normalized)) return DEFAULT_HTML_PREVIEW_THEME.colorScheme
  return normalized
}

function normalizePreviewTheme(theme: HtmlPreviewTheme): HtmlPreviewTheme {
  return {
    background: safeCssValue(theme.background, DEFAULT_HTML_PREVIEW_THEME.background),
    border: safeCssValue(theme.border, DEFAULT_HTML_PREVIEW_THEME.border),
    colorScheme: safeColorScheme(theme.colorScheme),
    foreground: safeCssValue(theme.foreground, DEFAULT_HTML_PREVIEW_THEME.foreground),
    fontFamily: safeCssValue(theme.fontFamily, DEFAULT_HTML_PREVIEW_THEME.fontFamily),
    link: safeCssValue(theme.link, DEFAULT_HTML_PREVIEW_THEME.link),
    muted: safeCssValue(theme.muted, DEFAULT_HTML_PREVIEW_THEME.muted),
  }
}

function buildPreviewStyle(theme: HtmlPreviewTheme): string {
  const safeTheme = normalizePreviewTheme(theme)
  return [
    ':root{',
    `color-scheme:${safeTheme.colorScheme};`,
    `--html-preview-bg:${safeTheme.background};`,
    `--html-preview-border:${safeTheme.border};`,
    `--html-preview-fg:${safeTheme.foreground};`,
    `--html-preview-font:${safeTheme.fontFamily};`,
    `--html-preview-link:${safeTheme.link};`,
    `--html-preview-muted:${safeTheme.muted};`,
    '}',
    'html,body{min-height:100%}',
    'body{margin:24px;background:var(--html-preview-bg);color:var(--html-preview-fg);font:14px/1.5 var(--html-preview-font)}',
    'a{color:var(--html-preview-link)}',
    'img,svg,video{max-width:100%;height:auto}',
    'table{border-collapse:collapse}',
    'td,th{border:1px solid var(--html-preview-border);padding:6px 8px}',
    'code,pre{background:color-mix(in srgb,var(--html-preview-border) 38%,transparent);border:1px solid var(--html-preview-border);border-radius:6px}',
    'code{padding:1px 4px}',
    'pre{padding:10px 12px;overflow:auto}',
    'blockquote{border-left:3px solid var(--html-preview-border);color:var(--html-preview-muted);margin-left:0;padding-left:12px}',
  ].join('')
}

/** Returns true when the vault entry should open as rendered HTML by default. */
export function isRenderableHtmlEntry(entry: Pick<VaultEntry, 'fileKind' | 'filename' | 'path'>, content: string): boolean {
  if (HTML_PATH_PATTERN.test(previewPath(entry))) return true
  if (entry.fileKind !== 'text' && entry.fileKind !== 'markdown') return false

  const trimmed = content.trim()
  return STANDALONE_HTML_START_PATTERN.test(trimmed) || HTML_BLOCK_PATTERN.test(trimmed)
}

/** Builds a sandboxed preview document for HTML source from the vault. */
export function buildHtmlPreviewDocument(source: string, theme: HtmlPreviewTheme = DEFAULT_HTML_PREVIEW_THEME): string {
  if (typeof DOMParser === 'undefined') return source

  const doc = new DOMParser().parseFromString(source, 'text/html')
  sanitizeDocument(doc)
  const previewStyle = buildPreviewStyle(theme)

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8">',
    '<base target="_blank">',
    `<style>${previewStyle}</style>`,
    doc.head.innerHTML,
    '</head>',
    '<body>',
    doc.body.innerHTML,
    '</body>',
    '</html>',
  ].join('')
}
