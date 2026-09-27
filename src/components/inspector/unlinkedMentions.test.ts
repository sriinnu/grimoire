import { describe, expect, it } from 'vitest'
import { linkFirstMention, mentionsPlainText, splitProtectedSpans } from './unlinkedMentions'

describe('splitProtectedSpans', () => {
  it('protects fenced code, inline code and existing wikilinks', () => {
    const parts = splitProtectedSpans('See Grimoire.\n```\nGrimoire\n```\n`Grimoire` and [[Grimoire]] done')
    expect(parts.map((part) => part.editable)).toEqual([true, false, true, false, true, false, true])
  })
})

describe('mentionsPlainText', () => {
  it('matches whole words case-insensitively in prose only', () => {
    expect(mentionsPlainText('the grimoire app', ['Grimoire'])).toBe(true)
    expect(mentionsPlainText('Grimoires are books', ['Grimoire'])).toBe(false)
    expect(mentionsPlainText('`Grimoire` in code', ['Grimoire'])).toBe(false)
    expect(mentionsPlainText('already [[Grimoire]]', ['Grimoire'])).toBe(false)
    expect(mentionsPlainText('the book of spells', ['Grimoire', 'book of spells'])).toBe(true)
  })
})

describe('linkFirstMention', () => {
  it('links only the first prose mention and keeps the original casing as an alias', () => {
    const next = linkFirstMention('The grimoire helps. Grimoire again.', 'Grimoire')
    expect(next).toBe('The [[Grimoire|grimoire]] helps. Grimoire again.')
  })

  it('uses a plain link when the mention matches the title exactly', () => {
    expect(linkFirstMention('Open Grimoire now', 'Grimoire')).toBe('Open [[Grimoire]] now')
  })

  it('skips mentions inside code and existing links', () => {
    const content = '```\nGrimoire\n```\n`Grimoire` then [[Grimoire]] then Grimoire.'
    expect(linkFirstMention(content, 'Grimoire')).toBe('```\nGrimoire\n```\n`Grimoire` then [[Grimoire]] then [[Grimoire]].')
  })

  it('links an alias to the title', () => {
    expect(linkFirstMention('read the spellbook', 'Grimoire', ['spellbook'])).toBe('read the [[Grimoire|spellbook]]')
  })

  it('returns null when nothing is mentioned', () => {
    expect(linkFirstMention('nothing here', 'Grimoire')).toBeNull()
  })
})
