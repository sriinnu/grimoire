import { describe, it, expect } from 'vitest'
import { filterPersonMentions, PERSON_MENTION_MIN_QUERY } from './personMentionSuggestions'
import type { WikilinkBaseItem } from './wikilinkSuggestions'

const items: WikilinkBaseItem[] = [
  { title: 'Karthik Reddy', aliases: ['Karthik'], group: 'Person', entryTitle: 'Karthik Reddy', path: '/person/karthik.md' },
  { title: 'Meera Krishnan', aliases: ['Meera'], group: 'Person', entryTitle: 'Meera Krishnan', path: '/person/meera.md' },
  { title: 'Build Grimoire App', aliases: ['Grimoire'], group: 'Project', entryTitle: 'Build Grimoire App', path: '/project/grimoire.md' },
  { title: 'Grow Newsletter', aliases: [], group: 'Responsibility', entryTitle: 'Grow Newsletter', path: '/resp/newsletter.md' },
  { title: 'Deepti Singh', aliases: ['Deepti'], group: 'Person', entryTitle: 'Deepti Singh', path: '/person/deepti.md' },
]

describe('filterPersonMentions', () => {
  it('returns only Person entries matching query on title', () => {
    const result = filterPersonMentions(items, 'mat')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Karthik Reddy')
  })

  it('matches on aliases', () => {
    const result = filterPersonMentions(items, 'Deepti')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Deepti Singh')
  })

  it('excludes non-Person entries even if they match the query', () => {
    const result = filterPersonMentions(items, 'Lap')
    expect(result).toHaveLength(0)
  })

  it('is case-insensitive', () => {
    const result = filterPersonMentions(items, 'MARIA')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Meera Krishnan')
  })

  it('returns multiple matches', () => {
    const result = filterPersonMentions(items, 'ma')
    expect(result).toHaveLength(2)
    const titles = result.map(r => r.title)
    expect(titles).toContain('Karthik Reddy')
    expect(titles).toContain('Meera Krishnan')
  })

  it('returns empty for query shorter than minimum', () => {
    const result = filterPersonMentions(items, '')
    expect(result).toHaveLength(0)
  })

  it('works with single-character query (min query is 1)', () => {
    expect(PERSON_MENTION_MIN_QUERY).toBe(1)
    const result = filterPersonMentions(items, 'e')
    expect(result).toHaveLength(2) // Karthik (alias) + Deepti
  })

  it('returns empty when no persons match', () => {
    const result = filterPersonMentions(items, 'zzz')
    expect(result).toHaveLength(0)
  })
})
