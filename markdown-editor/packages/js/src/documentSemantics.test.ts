import { describe, expect, it } from 'vitest'
import {
  formatMarkdownFrontmatter,
  parseMarkdownDocumentSemantics,
  upsertMarkdownToc,
} from './documentSemantics'

describe('parseMarkdownDocumentSemantics', () => {
  it('extracts frontmatter fields and body headings', () => {
    const result = parseMarkdownDocumentSemantics(`---
title: Alpha
tags:
  - grimoire
  - wiki
---
# Alpha

## Plan

### Next
`)

    expect(result.frontmatterState).toBe('valid')
    expect(result.frontmatterFields).toEqual([
      { key: 'title', value: 'Alpha', line: 2 },
      { key: 'tags', value: 'grimoire, wiki', line: 3 },
    ])
    expect(result.headings).toEqual([
      { level: 1, text: 'Alpha', slug: 'alpha', line: 7 },
      { level: 2, text: 'Plan', slug: 'plan', line: 9 },
      { level: 3, text: 'Next', slug: 'next', line: 11 },
    ])
  })

  it('ignores headings inside fenced code and dedupes slugs', () => {
    const result = parseMarkdownDocumentSemantics(`# Intro

\`\`\`
# Not Heading
\`\`\`

## Intro
## Intro
`)

    expect(result.headings).toEqual([
      { level: 1, text: 'Intro', slug: 'intro', line: 1 },
      { level: 2, text: 'Intro', slug: 'intro-2', line: 7 },
      { level: 2, text: 'Intro', slug: 'intro-3', line: 8 },
    ])
  })

  it('marks malformed frontmatter as no frontmatter when closing delimiter is missing', () => {
    const result = parseMarkdownDocumentSemantics('---\ntitle: Broken\n# Body')
    expect(result.frontmatterState).toBe('none')
    expect(result.headings).toEqual([{ level: 1, text: 'Body', slug: 'body', line: 3 }])
    expect(result.body).toBe('---\ntitle: Broken\n# Body')
  })
})

describe('formatMarkdownFrontmatter', () => {
  it('orders known keys and preserves unknown fields and body', () => {
    const result = formatMarkdownFrontmatter(`---
custom: keep
status: Draft
title: Alpha
tags:
    - wiki
    - graph
type: Note
---
# Alpha
`)

    expect(result.error).toBeNull()
    expect(result.changed).toBe(true)
    expect(result.markdown).toBe(`---
title: Alpha
type: Note
status: Draft
tags:
  - wiki
  - graph
custom: keep
---
# Alpha
`)
  })

  it('refuses missing frontmatter', () => {
    const result = formatMarkdownFrontmatter('# Alpha\n')
    expect(result).toEqual({
      markdown: '# Alpha\n',
      changed: false,
      error: 'No frontmatter block to format.',
    })
  })

  it('refuses malformed frontmatter', () => {
    const input = '---\n{broken: [yaml\n---\nBody'
    expect(formatMarkdownFrontmatter(input)).toEqual({
      markdown: input,
      changed: false,
      error: 'Frontmatter is invalid. Fix YAML before formatting.',
    })
  })
})

describe('upsertMarkdownToc', () => {
  it('inserts a generated TOC after the first H1', () => {
    expect(upsertMarkdownToc(`# Alpha

## Plan

### Next
`).markdown).toBe(`# Alpha

<!-- grimoire-toc:start -->
## Table of Contents

- [Alpha](#alpha)
  - [Plan](#plan)
    - [Next](#next)
<!-- grimoire-toc:end -->

## Plan

### Next
`)
  })

  it('replaces an existing generated TOC block', () => {
    const result = upsertMarkdownToc(`# Alpha

<!-- grimoire-toc:start -->
old
<!-- grimoire-toc:end -->

## Plan
`)

    expect(result.error).toBeNull()
    expect(result.markdown).toContain('- [Plan](#plan)')
    expect(result.markdown).not.toContain('old')
  })
})
