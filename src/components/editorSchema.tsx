/* eslint-disable react-refresh/only-export-components -- module-level schema, not a component file */
import { createCodeBlockSpec, BlockNoteSchema, defaultInlineContentSpecs } from '@blocknote/core'
import { codeBlockOptions } from '@blocknote/code-block'
import { createReactBlockSpec, createReactInlineContentSpec } from '@blocknote/react'
import { resolveWikilinkColor as resolveColor } from '../utils/wikilinkColors'
import { resolveEntry } from '../utils/wikilink'
import { MATH_BLOCK_TYPE, MATH_INLINE_TYPE, renderMathToHtml } from '../utils/mathMarkdown'
import { getLoadedKatex, loadKatex } from '../utils/katexLoader'
import { useEffect, useState } from 'react'
import type { VaultEntry } from '../types'
import { NoteTitleIcon } from './NoteTitleIcon'

// Module-level cache so the WikiLink renderer (defined outside React) can access entries
export const _wikilinkEntriesRef: { current: VaultEntry[] } = { current: [] }

function resolveWikilinkColor(target: string) {
  return resolveColor(_wikilinkEntriesRef.current, target)
}

/** Resolve the display text and optional note icon for a wikilink target.
 *  Priority: pipe display text → entry title → humanised path stem */
function resolveDisplayInfo(target: string): { text: string; icon: string | null } {
  const pipeIdx = target.indexOf('|')
  if (pipeIdx !== -1) {
    const entry = resolveEntry(_wikilinkEntriesRef.current, target.slice(0, pipeIdx))
    return { text: target.slice(pipeIdx + 1), icon: entry?.icon ?? null }
  }
  const entry = resolveEntry(_wikilinkEntriesRef.current, target)
  if (entry) {
    return { text: entry.title, icon: entry.icon ?? null }
  }
  const last = target.split('/').pop() ?? target
  return { text: last.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), icon: null }
}

export const WikiLink = createReactInlineContentSpec(
  {
    type: "wikilink" as const,
    propSchema: {
      target: { default: "" },
    },
    content: "none",
  },
  {
    render: (props) => {
      const target = props.inlineContent.props.target
      const { color, isBroken } = resolveWikilinkColor(target)
      const { text, icon } = resolveDisplayInfo(target)
      return (
        <span
          className={`wikilink${isBroken ? ' wikilink--broken' : ''}`}
          data-target={target}
          style={{ color }}
        >
          <NoteTitleIcon icon={icon} size={14} className="mr-1 align-middle" />
          {text}
        </span>
      )
    },
  }
)

function MathRender({ latex, displayMode }: { latex: string; displayMode: boolean }) {
  const source = displayMode ? `$$\n${latex}\n$$` : `$${latex}$`
  const [, setKatexReady] = useState(() => getLoadedKatex() !== null)
  useEffect(() => {
    if (getLoadedKatex()) return
    let alive = true
    void loadKatex().then(() => { if (alive) setKatexReady(true) })
    return () => { alive = false }
  }, [])
  return (
    <span
      aria-label={`Math: ${latex}`}
      className={displayMode ? 'math math--block' : 'math math--inline'}
      data-latex={latex}
      role="img"
      title={source}
      dangerouslySetInnerHTML={{ __html: renderMathToHtml({ latex, displayMode }) }}
    />
  )
}

export const MathInline = createReactInlineContentSpec(
  {
    type: MATH_INLINE_TYPE,
    propSchema: {
      latex: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <MathRender latex={props.inlineContent.props.latex} displayMode={false} />
    ),
  },
)

const MathBlock = createReactBlockSpec(
  {
    type: MATH_BLOCK_TYPE,
    propSchema: {
      latex: { default: '' },
    },
    content: 'none',
  },
  {
    render: (props) => (
      <div className="math-block-shell">
        <MathRender latex={props.block.props.latex} displayMode />
      </div>
    ),
  },
)

type ShikiHighlighter = Awaited<ReturnType<NonNullable<typeof codeBlockOptions.createHighlighter>>>
type CodeToTokensOptions = Parameters<ShikiHighlighter['codeToTokens']>[1]

/**
 * BlockNote tokenises with the first loaded Shiki theme (github-dark), so code
 * in light mode rendered near-white on paper. Ask Shiki for both themes as CSS
 * variables instead (--shiki-light / --shiki-dark) and let EditorTheme.css pick
 * one per data-theme — no re-highlight when the theme flips.
 */
export function withDualThemeTokens(highlighter: ShikiHighlighter): ShikiHighlighter {
  return new Proxy(highlighter, {
    get(target, property, receiver) {
      if (property === 'codeToTokens') {
        return (code: string, options: CodeToTokensOptions) => {
          const { theme: _singleTheme, ...rest } = (options ?? {}) as CodeToTokensOptions & { theme?: unknown }
          void _singleTheme
          return target.codeToTokens(code, {
            ...rest,
            themes: { light: 'github-light', dark: 'github-dark' },
            defaultColor: false,
          } as CodeToTokensOptions)
        }
      }
      const value = Reflect.get(target, property, receiver)
      return typeof value === 'function' ? value.bind(target) : value
    },
  })
}

const codeBlock = createCodeBlockSpec({
  ...codeBlockOptions,
  createHighlighter: async () => withDualThemeTokens(await codeBlockOptions.createHighlighter!()),
  defaultLanguage: 'text',
})
const mathBlock = MathBlock()

export const schema = BlockNoteSchema.create({
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    wikilink: WikiLink,
    mathInline: MathInline,
  },
}).extend({
  blockSpecs: {
    codeBlock,
    mathBlock,
  },
})
