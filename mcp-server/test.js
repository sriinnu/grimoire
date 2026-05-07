import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  findMarkdownFiles, getNote, searchNotes, vaultContext,
} from './vault.js'
import {
  createProjectTask,
  deleteProjectTask,
  listProjectDocs,
  listProjectTasks,
  projectGraph,
  readProjectBoard,
  updateProjectTask,
} from './project-intelligence.js'
import { evaluateBridgeRequest } from './ws-bridge.js'

let tmpDir
const ACTIVE_VAULT_ERROR = 'Note path must stay inside the active vault'

before(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'grimoire-mcp-test-'))

  await fs.mkdir(path.join(tmpDir, 'project'), { recursive: true })
  await fs.mkdir(path.join(tmpDir, 'note'), { recursive: true })

  await fs.writeFile(path.join(tmpDir, 'project', 'test-project.md'), `---
title: Test Project
is_a: Project
status: Active
---

# Test Project

This is a test project for the MCP server.
`)

  await fs.writeFile(path.join(tmpDir, 'note', 'daily-log.md'), `---
title: Daily Log
is_a: Note
---

# Daily Log

Today I worked on the MCP server implementation.
`)

  await fs.writeFile(path.join(tmpDir, 'project', 'second-project.md'), `---
title: Second Project
type: Project
status: Draft
belongs_to:
  - "[[project/test-project]]"
---

# Second Project

Another project for testing list and context.
`)

  await fs.writeFile(path.join(tmpDir, 'project', 'architecture.md'), `# Architecture

Links back to [[test-project]].

TODO: Extract project intelligence MCP tools.
`)
})

after(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('findMarkdownFiles', () => {
  it('should find all .md files recursively', async () => {
    const files = await findMarkdownFiles(tmpDir)
    assert.equal(files.length, 4)
    assert.ok(files.some(f => f.endsWith('test-project.md')))
    assert.ok(files.some(f => f.endsWith('daily-log.md')))
    assert.ok(files.some(f => f.endsWith('second-project.md')))
  })
})

describe('getNote', () => {
  it('should read a note with parsed frontmatter', async () => {
    const note = await getNote(tmpDir, 'project/test-project.md')
    assert.equal(note.path, 'project/test-project.md')
    assert.equal(note.frontmatter.title, 'Test Project')
    assert.equal(note.frontmatter.is_a, 'Project')
    assert.ok(note.content.includes('test project for the MCP server'))
  })

  it('should throw for missing notes', async () => {
    await assert.rejects(
      () => getNote(tmpDir, 'nonexistent.md'),
      { code: 'ENOENT' }
    )
  })

  it('should reject absolute paths outside the vault', async () => {
    await assertRejectsOutsideVault('grimoire-mcp-outside-', outsideNote => outsideNote)
  })

  it('should reject traversal paths outside the vault', async () => {
    await assertRejectsOutsideVault(
      'grimoire-mcp-traversal-',
      outsideNote => path.relative(tmpDir, outsideNote),
    )
  })
})

describe('searchNotes', () => {
  it('should find notes matching title', async () => {
    const results = await searchNotes(tmpDir, 'Test Project')
    assert.ok(results.length >= 1)
    assert.equal(results[0].title, 'Test Project')
  })

  it('should find notes matching content', async () => {
    const results = await searchNotes(tmpDir, 'MCP server')
    assert.ok(results.length >= 1)
  })

  it('should return empty for no matches', async () => {
    const results = await searchNotes(tmpDir, 'xyzzy-nonexistent-12345')
    assert.equal(results.length, 0)
  })

  it('should respect limit', async () => {
    const results = await searchNotes(tmpDir, 'project', 1)
    assert.ok(results.length <= 1)
  })
})

describe('vaultContext', () => {
  it('should return types, recent notes, and vault path', async () => {
    const ctx = await vaultContext(tmpDir)
    assert.ok(Array.isArray(ctx.types))
    assert.ok(Array.isArray(ctx.recentNotes))
    assert.equal(ctx.vaultPath, tmpDir)
  })

  it('should include known entity types', async () => {
    const ctx = await vaultContext(tmpDir)
    assert.ok(ctx.types.includes('Project'))
    assert.ok(ctx.types.includes('Note'))
  })

  it('should cap recent notes at 20', async () => {
    const ctx = await vaultContext(tmpDir)
    assert.ok(ctx.recentNotes.length <= 20)
  })

  it('should include path and title in recent notes', async () => {
    const ctx = await vaultContext(tmpDir)
    for (const note of ctx.recentNotes) {
      assert.ok(note.path)
      assert.ok(note.title)
    }
  })

  it('should include folders', async () => {
    const ctx = await vaultContext(tmpDir)
    assert.ok(ctx.folders.includes('project/'))
    assert.ok(ctx.folders.includes('note/'))
  })

  it('should report correct note count', async () => {
    const ctx = await vaultContext(tmpDir)
    assert.equal(ctx.noteCount, 4)
  })
})

describe('project intelligence MCP helpers', () => {
  it('lists project docs with useful roles', async () => {
    const docs = await listProjectDocs(tmpDir, 'project')
    assert.ok(docs.some(doc => doc.path === 'project/architecture.md' && doc.role === 'architecture'))
    assert.ok(docs.some(doc => doc.path === 'project/test-project.md'))
  })

  it('reads missing boards as an empty durable artifact', async () => {
    const board = await readProjectBoard(tmpDir, 'project')
    assert.equal(board.path, 'project/BOARD.md')
    assert.equal(board.exists, false)
    assert.equal(board.content, '')
  })

  it('creates, updates, lists, and deletes durable board tasks', async () => {
    const created = await createProjectTask(tmpDir, {
      folder: 'project',
      title: 'Ship project intelligence tools',
      priority: 'p1',
    })

    let tasks = await listProjectTasks(tmpDir, 'project')
    assert.ok(tasks.some(task => task.id === created.id && task.priority === 'p1'))

    await updateProjectTask(tmpDir, {
      folder: 'project',
      id: created.id,
      status: 'done',
      title: 'Ship project intelligence MCP tools',
    })
    tasks = await listProjectTasks(tmpDir, 'project')
    assert.ok(tasks.some(task => task.id === created.id && task.status === 'done'))

    const deleted = await deleteProjectTask(tmpDir, { folder: 'project', id: created.id })
    assert.equal(deleted.deleted, true)
    tasks = await listProjectTasks(tmpDir, 'project')
    assert.ok(!tasks.some(task => task.id === created.id))
  })

  it('reads generated board task metadata without duplicating scanner context', async () => {
    await fs.writeFile(
      path.join(tmpDir, 'project', 'BOARD.md'),
      [
        '# Project Board',
        '',
        '## Test Project',
        '',
        '### High',
        '<!-- grimoire-task:scanner-abc priority:high source:scanner source-file:src%2Feditor.ts source-line:7 --> - [ ] Polish wiki links (src/editor.ts:7)',
        '',
      ].join('\n'),
    )

    const tasks = await listProjectTasks(tmpDir, 'project')
    const generated = tasks.find(task => task.id === 'scanner-abc')
    assert.equal(generated.priority, 'high')
    assert.equal(generated.source, 'SCANNER')
    assert.equal(generated.sourceFile, 'src/editor.ts')
    assert.equal(generated.sourceLine, 7)
  })

  it('includes TODO markers and wikilink graph edges', async () => {
    const tasks = await listProjectTasks(tmpDir, 'project')
    assert.ok(tasks.some(task => task.source === 'TODO' && task.title.includes('MCP tools')))

    const graph = await projectGraph(tmpDir, 'project')
    assert.ok(graph.nodes.some(node => node.id === 'project/architecture.md'))
    assert.ok(graph.edges.some(edge => edge.from === 'project/architecture.md' && edge.to === 'project/test-project.md'))
  })

  it('rejects project traversal outside the vault', async () => {
    await assert.rejects(
      () => listProjectDocs(tmpDir, '../'),
      { message: 'Project path must stay inside the active vault' },
    )
  })
})

describe('evaluateBridgeRequest', () => {
  it('accepts loopback UI requests from trusted origins', () => {
    assert.deepEqual(
      evaluateBridgeRequest({
        bridgeType: 'ui',
        origin: 'http://localhost:5202',
        remoteAddress: '127.0.0.1',
      }),
      { ok: true, reason: null },
    )
  })

  it('rejects browser origins on the tool bridge', () => {
    assert.deepEqual(
      evaluateBridgeRequest({
        bridgeType: 'tool',
        origin: 'https://evil.example',
        remoteAddress: '127.0.0.1',
      }),
      { ok: false, reason: 'browser origins are not allowed on the tool bridge' },
    )
  })

  it('rejects non-loopback clients even without an origin', () => {
    assert.deepEqual(
      evaluateBridgeRequest({
        bridgeType: 'ui',
        origin: undefined,
        remoteAddress: '192.168.1.10',
      }),
      { ok: false, reason: 'non-local client' },
    )
  })
})

async function assertRejectsOutsideVault(prefix, resolveNotePath) {
  const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  const outsideNote = path.join(outsideDir, 'outside.md')

  try {
    await fs.writeFile(outsideNote, '# Outside\n')
    await assert.rejects(
      () => getNote(tmpDir, resolveNotePath(outsideNote)),
      { message: ACTIVE_VAULT_ERROR },
    )
  } finally {
    await fs.rm(outsideDir, { recursive: true, force: true })
  }
}
