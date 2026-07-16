/**
 * Conservative heuristic language detection for fenced code blocks that carry
 * no language tag. Shiki cannot auto-detect, so unlabeled blocks render as
 * plain text; this scores a handful of common languages and only answers when
 * one clearly wins.
 *
 * Strictly display-only: detected languages are applied to the live editor
 * document AFTER blocks are inserted (applyDetectedCodeLanguagesToEditor) and
 * reverted before any serialization or caching (stripInjectedCodeLanguages),
 * so a detected tag never reaches markdown on disk. Only a language the user
 * picks explicitly persists.
 */

interface LanguageSignal {
  language: string
  patterns: RegExp[]
}

const SIGNALS: LanguageSignal[] = [
  {
    language: 'rust',
    patterns: [/\bfn\s+\w+\s*\(/, /\blet\s+mut\b/, /\bimpl\b/, /\bpub\s+(?:fn|struct|enum|mod)\b/, /\w+::\w+/, /#\[\w+/],
  },
  {
    language: 'go',
    patterns: [/\bfunc\s+\w+\s*\(/, /^package\s+\w+/m, /:=/, /\bfmt\.\w+/, /\bgo\s+func\b/],
  },
  {
    language: 'python',
    patterns: [/\bdef\s+\w+\s*\(.*\)\s*:/, /^\s*(?:import|from)\s+\w+/m, /\bself\./, /\belif\b/, /\bprint\s*\(/, /^\s*@\w+\s*$/m],
  },
  {
    language: 'typescript',
    patterns: [/\binterface\s+\w+/, /\btype\s+\w+\s*=/, /:\s*(?:string|number|boolean|void|unknown)\b/, /\bexport\s+(?:const|function|type|interface)\b/, /\breadonly\b/],
  },
  {
    language: 'javascript',
    patterns: [/\bconst\s+\w+\s*=/, /=>\s*[{(]?/, /\bfunction\s+\w*\s*\(/, /\bimport\s+.*\s+from\s+['"]/, /\bconsole\.\w+\(/, /\bawait\s+\w+/],
  },
  {
    language: 'swift',
    patterns: [/\bfunc\s+\w+\s*\(.*\)\s*(?:->|{)/, /\bvar\s+\w+\s*:\s*\w+/, /\bguard\s+let\b/, /\bimport\s+(?:Foundation|SwiftUI|UIKit|AppKit)\b/, /@(?:State|Published|MainActor)\b/],
  },
  {
    language: 'sql',
    patterns: [/\bselect\b[\s\S]*\bfrom\b/i, /\binsert\s+into\b/i, /\bcreate\s+table\b/i, /\bwhere\b/i, /\bjoin\b/i],
  },
  {
    language: 'html',
    patterns: [/<\/?(?:div|span|p|html|body|head|section|article)\b/i, /<\w+\s+[^>]*=/, /<!doctype/i],
  },
  {
    language: 'css',
    patterns: [/[.#][\w-]+\s*\{/, /\b[\w-]+\s*:\s*[^;{]+;/, /@media\b/, /--[\w-]+\s*:/],
  },
  {
    language: 'shellscript',
    patterns: [/^#!\s*\/.*\b(?:bash|sh|zsh)\b/m, /^\s*(?:sudo|brew|apt|npm|pnpm|cargo|git|cd|echo|export)\s+/m, /\$\{?\w+/, /\s(?:&&|\|\|)\s/],
  },
]

function extractText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractText).join('')
  if (value && typeof value === 'object' && 'text' in value) return String((value as { text: unknown }).text ?? '')
  return ''
}

/** Returns a supported shiki language id, or null when no language clearly wins. */
export function detectCodeLanguage(code: string): string | null {
  const trimmed = code.trim()
  if (trimmed.length < 12) return null

  // JSON and YAML have cheap, near-certain structural checks.
  if (/^[{[]/.test(trimmed)) {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch { /* fall through to scoring */ }
  }
  const lines = trimmed.split('\n')
  const yamlish = lines.filter((line) => /^[\w"'-]+[\w"' -]*:\s/.test(line) || /^\s*-\s+\S/.test(line) || line.trim() === '---')
  if (lines.length >= 2 && yamlish.length / lines.length > 0.7 && !/[{};]/.test(trimmed)) return 'yaml'

  let best: { language: string; score: number } | null = null
  let runnerUp = 0
  for (const signal of SIGNALS) {
    const score = signal.patterns.reduce((sum, pattern) => sum + (pattern.test(trimmed) ? 1 : 0), 0)
    if (!best || score > best.score) {
      runnerUp = best?.score ?? 0
      best = { language: signal.language, score }
    } else if (score > runnerUp) {
      runnerUp = score
    }
  }
  // TypeScript signals imply JavaScript ones; prefer TS only on its own merits.
  if (best && best.score >= 2 && best.score > runnerUp) return best.language
  return null
}

interface CodeBlockLike {
  id?: string
  type?: string
  props?: { language?: string } & Record<string, unknown>
  content?: unknown
  children?: CodeBlockLike[]
}

/** Minimal editor surface needed to apply detected languages to a live document. */
export interface CodeLanguageDetectionTarget {
  document: unknown[]
  updateBlock(blockId: string, update: { props: { language: string } }): unknown
}

/**
 * Block ids whose language was injected by detection, mapped to the detected
 * language. Repopulated from scratch on every apply pass (one document is live
 * at a time), so entries never leak across notes; consulted at serialize and
 * cache time to strip the injected tag back out.
 */
const injectedLanguages = new Map<string, string>()

function visitBlocks(blocks: CodeBlockLike[], visit: (block: CodeBlockLike) => void) {
  for (const block of blocks) {
    visit(block)
    if (block.children?.length) visitBlocks(block.children, visit)
  }
}

/**
 * Display-only pass: detects languages for unlabeled code blocks in the live
 * editor document and applies them via updateBlock, tracking each injection by
 * block id. Run right after blocks are applied to the editor, while its change
 * handling is still suppressed, so the injection never marks the note dirty.
 */
export function applyDetectedCodeLanguagesToEditor(editor: CodeLanguageDetectionTarget): void {
  injectedLanguages.clear()
  visitBlocks(editor.document as CodeBlockLike[], (block) => {
    if (block.type !== 'codeBlock' || !block.id) return
    const language = block.props?.language
    if (language && language !== 'text') return
    const detected = detectCodeLanguage(extractText(block.content))
    if (!detected) return
    editor.updateBlock(block.id, { props: { language: detected } })
    injectedLanguages.set(block.id, detected)
  })
}

/**
 * Reverts detection-injected languages before serialization or caching so the
 * markdown keeps its original unlabeled fences (language '' serializes to a
 * bare ``` fence; the parse default 'text' would serialize as ```text). A code
 * block whose current language no longer matches the recorded detection was
 * overridden by the user — it is dropped from tracking and the explicit choice
 * persists.
 */
export function stripInjectedCodeLanguages<T>(blocks: T[]): T[] {
  if (injectedLanguages.size === 0) return blocks
  return blocks.map((raw) => {
    const block = raw as CodeBlockLike
    let next = block
    const recorded = block.type === 'codeBlock' && block.id
      ? injectedLanguages.get(block.id)
      : undefined
    if (recorded !== undefined) {
      if (block.props?.language === recorded) {
        next = { ...block, props: { ...block.props, language: '' } }
      } else if (block.id) {
        injectedLanguages.delete(block.id)
      }
    }
    if (next.children?.length) {
      const children = stripInjectedCodeLanguages(next.children)
      if (children !== next.children) next = { ...next, children }
    }
    return next as T
  })
}
