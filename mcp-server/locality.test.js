import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  frontmatterMarksLocalOnly,
  isLocalOnlyRelativePath,
} from './locality.js'

describe('MCP Locality Firewall parity', () => {
  it('matches protected path lanes used by the app and native exporter', () => {
    for (const relativePath of [
      'dreams/flight.md',
      'health/report.md',
      'journal/today.md',
      'memory/crystallized/note.md',
      'notes/local-only/hidden.md',
      'private/diary.md',
      'therapy/session.md',
    ]) {
      assert.equal(isLocalOnlyRelativePath(relativePath), true, relativePath)
    }

    assert.equal(isLocalOnlyRelativePath('projects/private-sector.md'), false)
  })

  it('matches protected frontmatter keys, types, and truthy values', () => {
    for (const frontmatter of [
      { egress: 'blocked' },
      { locality: 'local' },
      { local_only: true },
      { no_sync: 'deny' },
      { never_sync: ['public', 'never'] },
      { private: 1 },
      { type: 'Import Report' },
      { type: 'Memory' },
      { is_a: 'Sadhana' },
    ]) {
      assert.equal(frontmatterMarksLocalOnly(frontmatter), true, JSON.stringify(frontmatter))
    }

    assert.equal(frontmatterMarksLocalOnly({ type: 'Project', locality: 'remote' }), false)
  })
})
