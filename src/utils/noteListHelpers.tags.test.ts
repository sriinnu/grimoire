import { afterEach, describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { publishTagSnapshot, resetTagSnapshotForTests } from '../lib/bodyIndex/tagSnapshot'
import { countTagByFilter, filterEntries } from './noteListHelpers'

const garden = makeEntry({ path: '/v/garden.md', filename: 'garden.md', title: 'Garden' })
const kitchen = makeEntry({ path: '/v/kitchen.md', filename: 'kitchen.md', title: 'Kitchen', archived: true })
const other = makeEntry({ path: '/v/other.md', filename: 'other.md', title: 'Other' })

afterEach(() => resetTagSnapshotForTests())

describe('tag selections in the note list', () => {
  it('filters to the paths carrying the tag, open notes by default', () => {
    publishTagSnapshot({ version: 1, tags: [{ tag: 'home', count: 2, paths: ['/v/garden.md', '/v/kitchen.md'] }] })
    const entries = [garden, kitchen, other]
    expect(filterEntries(entries, { kind: 'tag', tag: 'home' }).map((entry) => entry.title)).toEqual(['Garden'])
    expect(filterEntries(entries, { kind: 'tag', tag: 'home' }, 'archived').map((entry) => entry.title)).toEqual(['Kitchen'])
    expect(filterEntries(entries, { kind: 'tag', tag: 'nope' })).toEqual([])
  })

  it('prefers an explicit path set over the shared snapshot', () => {
    const entries = [garden, kitchen, other]
    const explicit = new Set(['/v/other.md'])
    expect(filterEntries(entries, { kind: 'tag', tag: 'home' }, undefined, undefined, undefined, explicit).map((entry) => entry.title)).toEqual(['Other'])
  })

  it('counts open and archived notes for a tag', () => {
    expect(countTagByFilter([garden, kitchen, other], new Set(['/v/garden.md', '/v/kitchen.md']))).toEqual({ open: 1, archived: 1 })
  })
})
