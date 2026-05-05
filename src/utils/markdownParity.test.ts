import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { markdownSemanticsAdapter } from './markdownSemanticsAdapter'

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
  return JSON.parse(readFileSync(`${process.cwd()}/markdown-editor/packages/swift/Fixtures/markdown-parity.json`, 'utf8')) as MarkdownParityFixtures
}

const fixtures = loadFixtures()

describe('MarkdownEditor Swift/Tauri parity fixtures', () => {
  it('keeps every fixture group populated with unique names', () => {
    const groups = Object.entries(fixtures) as [keyof MarkdownParityFixtures, Array<{ name: string }>][]

    for (const [group, cases] of groups) {
      expect(cases.length, `${group} should not be empty`).toBeGreaterThan(0)
      expect(new Set(cases.map(item => item.name)).size, `${group} names should be unique`).toBe(cases.length)
    }
  })

  it.each(fixtures.compactMarkdown)('compacts markdown: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.compact(input)).toBe(output)
  })

  it.each(fixtures.wikilinkPreprocess)('preprocesses wikilinks: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.preprocessWikilinks(input)).toBe(output)
  })

  it.each(fixtures.frontmatterSplits)('splits frontmatter: $name', ({ input, frontmatter, body }) => {
    expect(markdownSemanticsAdapter.splitFrontmatter(input)).toEqual({ frontmatter, body })
  })

  it.each(fixtures.outgoingLinks)('extracts outgoing links: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.extractOutgoingLinks(input)).toEqual(output)
  })

  it.each(fixtures.snippets)('extracts snippets: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.extractSnippet(input)).toBe(output)
  })

  it.each(fixtures.wordCounts)('counts words: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.countWords(input)).toBe(output)
  })

  it.each(fixtures.mathPreprocess)('preprocesses math: $name', ({ input, output }) => {
    expect(markdownSemanticsAdapter.preprocessMath(input)).toBe(output)
  })
})
