import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compactMarkdown } from './compact-markdown'
import { preProcessMathMarkdown } from './mathMarkdown'
import {
  countWords,
  extractOutgoingLinks,
  extractSnippet,
  preProcessWikilinks,
  splitFrontmatter,
} from './wikilinks'

interface StringCase {
  name: string
  input: string
  output: string
}

interface FrontmatterCase {
  name: string
  input: string
  frontmatter: string
  body: string
}

interface StringArrayCase {
  name: string
  input: string
  output: string[]
}

interface NumberCase {
  name: string
  input: string
  output: number
}

interface MarkdownParityFixtures {
  compactMarkdown: StringCase[]
  wikilinkPreprocess: StringCase[]
  frontmatterSplits: FrontmatterCase[]
  outgoingLinks: StringArrayCase[]
  snippets: StringCase[]
  wordCounts: NumberCase[]
  mathPreprocess: StringCase[]
}

function loadFixtures(): MarkdownParityFixtures {
  return JSON.parse(readFileSync(`${process.cwd()}/packages/MarkdownEditor/Fixtures/markdown-parity.json`, 'utf8')) as MarkdownParityFixtures
}

const fixtures = loadFixtures()

describe('MarkdownEditor Swift/Tauri parity fixtures', () => {
  it.each(fixtures.compactMarkdown)('compacts markdown: $name', ({ input, output }) => {
    expect(compactMarkdown(input)).toBe(output)
  })

  it.each(fixtures.wikilinkPreprocess)('preprocesses wikilinks: $name', ({ input, output }) => {
    expect(preProcessWikilinks(input)).toBe(output)
  })

  it.each(fixtures.frontmatterSplits)('splits frontmatter: $name', ({ input, frontmatter, body }) => {
    expect(splitFrontmatter(input)).toEqual([frontmatter, body])
  })

  it.each(fixtures.outgoingLinks)('extracts outgoing links: $name', ({ input, output }) => {
    expect(extractOutgoingLinks(input)).toEqual(output)
  })

  it.each(fixtures.snippets)('extracts snippets: $name', ({ input, output }) => {
    expect(extractSnippet(input)).toBe(output)
  })

  it.each(fixtures.wordCounts)('counts words: $name', ({ input, output }) => {
    expect(countWords(input)).toBe(output)
  })

  it.each(fixtures.mathPreprocess)('preprocesses math: $name', ({ input, output }) => {
    expect(preProcessMathMarkdown({ markdown: input })).toBe(output)
  })
})
