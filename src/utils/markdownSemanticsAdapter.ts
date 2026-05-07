import {
  parseMarkdownDocumentSemantics,
  type MarkdownDocumentSemantics,
} from '@grimoire/markdown-editor'
import { compactMarkdown } from './compact-markdown'
import { preProcessMathMarkdown } from './mathMarkdown'
import {
  countWords,
  extractBacklinkContext,
  extractOutgoingLinks,
  extractSnippet,
  preProcessWikilinks,
  splitFrontmatter,
} from './wikilinks'

/** Frontmatter/body split used by platform markdown adapters. */
export interface MarkdownFrontmatterSplit {
  frontmatter: string
  body: string
}

/** Platform-neutral markdown semantics used by the Tauri editor shell. */
export interface MarkdownSemanticsAdapter {
  compact(markdown: string): string
  preprocessWikilinks(markdown: string): string
  preprocessMath(markdown: string): string
  splitFrontmatter(markdown: string): MarkdownFrontmatterSplit
  extractOutgoingLinks(markdown: string): string[]
  extractBacklinkContext(markdown: string, targets: Set<string>, maxLength?: number): string | null
  extractSnippet(markdown: string): string
  countWords(markdown: string): number
  parseDocument(markdown: string): MarkdownDocumentSemantics
}

/** Tauri implementation of the shared markdown semantics contract. */
export const markdownSemanticsAdapter: MarkdownSemanticsAdapter = {
  compact: compactMarkdown,
  preprocessWikilinks: preProcessWikilinks,
  preprocessMath: markdown => preProcessMathMarkdown({ markdown }),
  splitFrontmatter: markdown => {
    const [frontmatter, body] = splitFrontmatter(markdown)
    return { frontmatter, body }
  },
  extractOutgoingLinks,
  extractBacklinkContext,
  extractSnippet,
  countWords,
  parseDocument: parseMarkdownDocumentSemantics,
}
