import { describe, expect, it } from 'vitest'
import {
  BodyIndexStore,
  extractTags,
  mentionsPhrase,
  normalizeTag,
  stripNonProse,
  tagLineage,
} from './bodyIndexCore'

const NOTE = `---
title: Garden
tags: [Plants, home/garden]
---

# Garden

Planting #tomatoes and #herbs/basil this spring. Issue #42 is not a tag.

\`\`\`sh
echo "#not-a-tag in a fence"
\`\`\`

Inline \`#also-not\` here, but (#parens) counts and #Herbs again.
`

describe('normalizeTag', () => {
  it('lowercases, strips hashes and slashes, rejects numbers and empties', () => {
    expect(normalizeTag('#Plants')).toBe('plants')
    expect(normalizeTag('/home/garden/')).toBe('home/garden')
    expect(normalizeTag('a//b')).toBe('a/b')
    expect(normalizeTag('42')).toBeNull()
    expect(normalizeTag('  ')).toBeNull()
  })
})

describe('tagLineage', () => {
  it('yields every ancestor so nested tags count under their parents', () => {
    expect(tagLineage('a/b/c')).toEqual(['a', 'a/b', 'a/b/c'])
    expect(tagLineage('solo')).toEqual(['solo'])
  })
})

describe('stripNonProse', () => {
  it('removes frontmatter, fenced blocks and inline code', () => {
    const prose = stripNonProse(NOTE)
    expect(prose).not.toContain('title: Garden')
    expect(prose).not.toContain('not-a-tag')
    expect(prose).not.toContain('also-not')
    expect(prose).toContain('Planting #tomatoes')
  })

  it('handles ~~~ fences and unterminated fences without eating the note', () => {
    const tilde = stripNonProse('a\n~~~\ncode #x\n~~~\nb #y')
    expect(tilde).not.toContain('#x')
    expect(tilde).toContain('b #y')
    expect(stripNonProse('a\n```\ncode #x\nstill #y')).toContain('#y')
  })
})

describe('extractTags', () => {
  it('merges frontmatter and body tags, skips code and issue numbers, dedupes case-insensitively', () => {
    expect(extractTags(NOTE)).toEqual(['plants', 'home/garden', 'tomatoes', 'herbs/basil', 'parens', 'herbs'])
  })

  it('reads a scalar tags field and a multi-line list', () => {
    expect(extractTags('---\ntags: alpha, Beta\n---\n')).toEqual(['alpha', 'beta'])
    expect(extractTags('---\ntags:\n  - one\n  - two/three\n---\n')).toEqual(['one', 'two/three'])
  })

  it('never treats a heading as a tag', () => {
    expect(extractTags('# Heading\n\n## Another\n\ntext')).toEqual([])
  })
})

describe('mentionsPhrase', () => {
  it('matches whole words only, case-insensitively, across whitespace', () => {
    expect(mentionsPhrase('we met test project yesterday', 'Test Project')).toBe(true)
    expect(mentionsPhrase('we met test  project', 'test project')).toBe(true)
    expect(mentionsPhrase('contest projects', 'test project')).toBe(false)
    expect(mentionsPhrase('anything', '  ')).toBe(false)
  })
})

describe('BodyIndexStore', () => {
  it('indexes tags with ancestors, counts, and paths', () => {
    const store = new BodyIndexStore()
    store.update('/a.md', 'text #home/garden #plants')
    store.update('/b.md', 'more #home/kitchen')
    expect(store.allTags()).toEqual([
      { tag: 'home', count: 2 },
      { tag: 'home/garden', count: 1 },
      { tag: 'home/kitchen', count: 1 },
      { tag: 'plants', count: 1 },
    ])
    expect(store.pathsWithTag('home')).toEqual(['/a.md', '/b.md'])
    expect(store.pathsWithTag('#Home/Garden')).toEqual(['/a.md'])
    expect(store.tagsFor('/a.md')).toEqual(['home/garden', 'plants'])
  })

  it('updates incrementally: a re-saved note drops tags it no longer carries', () => {
    const store = new BodyIndexStore()
    store.update('/a.md', '#alpha #beta')
    store.update('/a.md', '#beta')
    expect(store.allTags()).toEqual([{ tag: 'beta', count: 1 }])
    expect(store.pathsWithTag('alpha')).toEqual([])
  })

  it('removes a note and its tag entries, and clears everything', () => {
    const store = new BodyIndexStore()
    store.update('/a.md', '#alpha')
    store.update('/b.md', '#alpha')
    store.remove('/a.md')
    expect(store.allTags()).toEqual([{ tag: 'alpha', count: 1 }])
    expect(store.has('/a.md')).toBe(false)
    store.clear()
    expect(store.size()).toBe(0)
    expect(store.allTags()).toEqual([])
  })

  it('finds notes mentioning a phrase as whole words, outside code, capped', () => {
    const store = new BodyIndexStore()
    store.update('/a.md', 'We discussed the Test Project at lunch.')
    store.update('/b.md', '```\nTest Project inside code\n```\n')
    store.update('/c.md', 'A contest projected onto a wall.')
    store.update('/d.md', 'test project again')
    expect(store.pathsMentioning('test project')).toEqual(['/a.md', '/d.md'])
    expect(store.pathsMentioning('test project', 1)).toHaveLength(1)
  })

  it('bumps the snapshot version on every mutation and lists paths per tag', () => {
    const store = new BodyIndexStore()
    const before = store.snapshot().version
    store.update('/a.md', '#x')
    const after = store.snapshot()
    expect(after.version).toBeGreaterThan(before)
    expect(after.tags).toEqual([{ tag: 'x', count: 1, paths: ['/a.md'] }])
  })
})
